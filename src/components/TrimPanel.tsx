import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Button, Card, Typography, Space, message, Progress, notification, Input, List } from 'antd';
import { ScissorOutlined, PlusOutlined, DeleteOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { useProgress } from '../hooks/useProgress';

const { Text } = Typography;

interface TrimPanelProps {
    filePath: string | null;
    videoRef: React.RefObject<HTMLVideoElement | null> | null;
}

interface Segment {
    id: number;
    start: string; // HH:MM:SS
    end: string;   // HH:MM:SS
}

const timeToSeconds = (timeStr: string): number | null => {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
    return h * 3600 + m * 60 + s;
};

const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const TrimPanel: React.FC<TrimPanelProps> = ({ filePath, videoRef }) => {
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<string[]>([]);
    const { progress, resetProgress } = useProgress();

    // Multi-segment state
    const [segments, setSegments] = useState<Segment[]>([]);
    const [startInput, setStartInput] = useState('00:00:00');
    const [endInput, setEndInput] = useState('00:00:10');

    const getCurrentTime = () => {
        if (videoRef && videoRef.current) {
            return formatTime(videoRef.current.currentTime);
        }
        return '00:00:00';
    };

    const handleAddSegment = () => {
        const startSec = timeToSeconds(startInput);
        const endSec = timeToSeconds(endInput);

        if (startSec === null || endSec === null) {
            message.error("Invalid time format. Use HH:MM:SS");
            return;
        }

        if (startSec >= endSec) {
            message.error("Start time must be before End time");
            return;
        }

        const newSegment: Segment = {
            id: Date.now(),
            start: startInput,
            end: endInput,
        };
        setSegments([...segments, newSegment]);
    };

    const handleDeleteSegment = (id: number) => {
        setSegments(segments.filter(s => s.id !== id));
    };

    const handleTrimAll = async () => {
        if (!filePath) return;
        if (segments.length === 0) {
            message.warning("Please add at least one segment to trim.");
            return;
        }

        setProcessing(true);
        resetProgress();
        setResults([]);
        const createdFiles: string[] = [];

        try {
            for (let i = 0; i < segments.length; i++) {
                const segment = segments[i];
                const startSec = timeToSeconds(segment.start)!;
                const endSec = timeToSeconds(segment.end)!;
                const duration = endSec - startSec;

                const output = await invoke<string>('trim_video', {
                    input: filePath,
                    start: Number(startSec),
                    duration: Number(duration),
                    index: i + 1
                });

                createdFiles.push(output);
                message.success(`Segment ${i + 1} created`);
            }

            setResults(createdFiles);
            notification.success({
                message: 'Batch Trim Complete',
                description: `Created ${createdFiles.length} files.`,
            });
        } catch (err) {
            console.error(err);
            message.error(`Trim failed: ${err}`);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Card title={
            <div>
                <Text style={{ color: 'white', display: 'block' }}>Multi-Segment Trim</Text>
                <Text style={{ color: '#888', fontSize: '12px', fontWeight: 'normal' }}>Cut and save specific parts of your video.</Text>
            </div>
        } bordered={false} style={{ background: 'transparent', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>

                <div style={{ textAlign: 'center', padding: '2rem', background: '#1f1f1f', borderRadius: '8px', border: '1px dashed #444' }}>
                    <Text style={{ color: '#888' }}>
                        {filePath ? `File: ${filePath}` : "Please select a file first"}
                    </Text>
                </div>

                {/* Segment Input Form */}
                <Card size="small" title="Add Segment" style={{ background: '#141414', borderColor: '#303030' }}>
                    <Space>
                        <Input
                            placeholder="Start (HH:MM:SS)"
                            value={startInput}
                            onChange={e => setStartInput(e.target.value)}
                            style={{ width: 120 }}
                            prefix={<span style={{ fontSize: 10, color: '#666' }}>Start</span>}
                        />
                        <Button icon={<FieldTimeOutlined />} onClick={() => setStartInput(getCurrentTime())} title="Capture Current Time" />

                        <Text style={{ color: 'white' }}>to</Text>

                        <Input
                            placeholder="End (HH:MM:SS)"
                            value={endInput}
                            onChange={e => setEndInput(e.target.value)}
                            style={{ width: 120 }}
                            prefix={<span style={{ fontSize: 10, color: '#666' }}>End</span>}
                        />
                        <Button icon={<FieldTimeOutlined />} onClick={() => setEndInput(getCurrentTime())} title="Capture Current Time" />

                        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddSegment}>
                            Add
                        </Button>
                    </Space>
                </Card>

                {/* Segment List */}
                {segments.length > 0 && (
                    <List
                        size="small"
                        bordered
                        dataSource={segments}
                        renderItem={(item, index) => (
                            <List.Item
                                actions={[
                                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSegment(item.id)} />
                                ]}
                                style={{ color: 'white' }}
                            >
                                <Text style={{ color: 'white' }}>
                                    #{index + 1}: {item.start} - {item.end} (Duration: {timeToSeconds(item.end)! - timeToSeconds(item.start)!}s)
                                </Text>
                            </List.Item>
                        )}
                        style={{ background: '#1f1f1f', borderColor: '#444' }}
                    />
                )}

                <Button
                    block
                    type="primary"
                    danger
                    icon={<ScissorOutlined />}
                    onClick={handleTrimAll}
                    disabled={!filePath || processing || segments.length === 0}
                    loading={processing}
                    size="large"
                >
                    {processing ? 'Processing Segments...' : 'Process All Segments'}
                </Button>

                {processing && <Progress percent={Math.round(progress)} status="active" strokeColor={{ from: '#108ee9', to: '#87d068' }} />}

                {results.length > 0 && (
                    <div style={{ padding: '1rem', background: '#112a14', borderRadius: '8px', border: '1px solid #237804' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <Text type="success" strong>Success! Created {results.length} files:</Text>
                            <Button size="small" type="text" danger onClick={() => setResults([])}>Clear</Button>
                        </div>
                        <List
                            size="small"
                            dataSource={results}
                            renderItem={item => <List.Item><Text style={{ color: '#b7eb8f', wordBreak: 'break-all' }}>{item}</Text></List.Item>}
                        />
                    </div>
                )}
            </Space>
        </Card>
    );
};

export default TrimPanel;

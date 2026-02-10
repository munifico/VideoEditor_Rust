import React, { useState } from 'react';
import { Card, Typography, Space, Button, Input, List, Form, InputNumber, Progress, notification, message } from 'antd';
import { RobotOutlined, PlusOutlined, DeleteOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { useProgress } from '../hooks/useProgress';

const { Text } = Typography;

interface Segment {
    id: number;
    start: string;
    end: string;
}

interface AutoPanelProps {
    filePath: string | null;
    videoRef: React.RefObject<HTMLVideoElement | null> | null;
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

const AutoPanel: React.FC<AutoPanelProps> = ({ filePath, videoRef }) => {
    const [segments, setSegments] = useState<Segment[]>([]);
    const [startInput, setStartInput] = useState('00:00:00');
    const [endInput, setEndInput] = useState('00:00:10');

    // Resize settings
    const [width, setWidth] = useState<number>(1280);
    const [height, setHeight] = useState<number>(720);
    const [outputPath, setOutputPath] = useState<string | null>(null);

    const [processing, setProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<string>('');
    const [finalFile, setFinalFile] = useState<string | null>(null);
    const { progress, resetProgress } = useProgress();

    const getCurrentTime = () => {
        if (videoRef && videoRef.current) {
            return formatTime(videoRef.current.currentTime);
        }
        return '00:00:00';
    };

    const handleSetOutputPath = async () => {
        try {
            const path = await save({
                filters: [{ name: 'Video', extensions: ['mp4'] }]
            });
            if (path) setOutputPath(path);
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddSegment = () => {
        const startSec = timeToSeconds(startInput);
        const endSec = timeToSeconds(endInput);
        if (startSec === null || endSec === null || startSec >= endSec) {
            message.error("Invalid time range");
            return;
        }
        setSegments([...segments, { id: Date.now(), start: startInput, end: endInput }]);
    };

    const handleDeleteSegment = (id: number) => {
        setSegments(segments.filter(s => s.id !== id));
    };

    const handleBatchProcess = async () => {
        if (!filePath || segments.length === 0) return;
        setProcessing(true);
        setCurrentStep('Starting automation...');
        resetProgress();
        setFinalFile(null);

        // Track temporary files for cleanup
        const tempFiles: string[] = [];

        try {
            // 1. Trim multiple segments
            const trimFiles: string[] = [];
            for (let i = 0; i < segments.length; i++) {
                setCurrentStep(`Trimming segment ${i + 1}/${segments.length}...`);
                resetProgress();
                const s = segments[i];
                const start = timeToSeconds(s.start)!;
                const duration = timeToSeconds(s.end)! - start;
                const out = await invoke<string>('trim_video', { input: filePath, start, duration, index: i + 1 });
                trimFiles.push(out);
                tempFiles.push(out);
            }

            let fileToResize = trimFiles[0];

            // 2. If multiple segments, merge them
            if (trimFiles.length > 1) {
                setCurrentStep('Merging segments...');
                resetProgress();
                // Approximate total duration for progress
                const merged = await invoke<string>('merge_videos', { inputs: trimFiles, totalDuration: 100 });
                fileToResize = merged;
                tempFiles.push(merged);
            }

            // 3. Resize the result
            setCurrentStep('Resizing video...');
            resetProgress();
            // Pass outputPath if selected, otherwise pass null (backend handles default)
            const finalOutput = await invoke<string>('resize_video', {
                input: fileToResize,
                width,
                height,
                totalDuration: 0,
                outputPath: outputPath || null
            });

            setFinalFile(finalOutput);

            // 4. Cleanup intermediate files
            if (tempFiles.length > 0) {
                setCurrentStep('Cleaning up temporary files...');
                await invoke('delete_files', { files: tempFiles });
                console.log("Cleanup complete. Deleted:", tempFiles);
            }

            notification.success({
                message: 'Automation Complete',
                description: 'Trim -> Merge -> Resize finished! Intermediate files cleaned.'
            });

        } catch (err) {
            console.error(err);
            message.error(`Automation failed: ${err}`);
        } finally {
            setProcessing(false);
            setCurrentStep('');
        }
    };

    return (
        <Card title={
            <div>
                <Text style={{ color: 'white', display: 'block' }}>Batch Automation</Text>
                <Text style={{ color: '#888', fontSize: '12px', fontWeight: 'normal' }}>Automatically Trim, Merge, and Resize your video in one seamless workflow.</Text>
            </div>
        } bordered={false} style={{ background: 'transparent', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ padding: '1rem', background: '#1f1f1f', borderRadius: '8px', border: '1px dashed #444' }}>
                    <Text style={{ color: '#888' }}>
                        {filePath ? `Target: ${filePath}` : "Please select a file first"}
                    </Text>
                </div>

                {/* Trim Section */}
                <Card size="small" title="1. Trim Segments" style={{ background: '#141414', borderColor: '#303030' }}>
                    <Space style={{ flexWrap: 'wrap' }}>
                        <Input value={startInput} onChange={e => setStartInput(e.target.value)} style={{ width: 140 }} prefix="Start" />
                        <Button icon={<FieldTimeOutlined />} onClick={() => setStartInput(getCurrentTime())} />
                        <Text style={{ color: 'white' }}>~</Text>
                        <Input value={endInput} onChange={e => setEndInput(e.target.value)} style={{ width: 140 }} prefix="End" />
                        <Button icon={<FieldTimeOutlined />} onClick={() => setEndInput(getCurrentTime())} />
                        <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddSegment}>Add</Button>
                    </Space>
                    <List
                        size="small"
                        dataSource={segments}
                        renderItem={(item, index) => (
                            <List.Item actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteSegment(item.id)} />]}>
                                <Text style={{ color: 'white' }}>#{index + 1}: {item.start} ~ {item.end}</Text>
                            </List.Item>
                        )}
                        style={{ marginTop: 8 }}
                    />
                </Card>

                {/* Resize Section */}
                <Card size="small" title="2. Resize & Output" style={{ background: '#141414', borderColor: '#303030' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>

                        {/* Presets */}
                        <Space style={{ marginBottom: 8, flexWrap: 'wrap' }}>
                            <Button size="small" onClick={() => { setWidth(1920); setHeight(1080); }}>Movie (1080p)</Button>
                            <Button size="small" onClick={() => { setWidth(1366); setHeight(768); }}>Laptop</Button>
                            <Button size="small" onClick={() => { setWidth(1280); setHeight(800); }}>Tablet</Button>
                            <Button size="small" onClick={() => { setWidth(1080); setHeight(1920); }}>Mobile</Button>
                            <Button size="small" type="dashed" onClick={() => {
                                const saved = localStorage.getItem('customResize');
                                if (saved) {
                                    const parsed = JSON.parse(saved);
                                    if (parsed.w && parsed.h) {
                                        setWidth(parsed.w);
                                        setHeight(parsed.h);
                                        message.success('Custom preset loaded');
                                    }
                                } else {
                                    message.info('No custom preset found');
                                }
                            }}>Load Custom</Button>
                        </Space>

                        <Form layout="inline" style={{ flexWrap: 'wrap' }}>
                            <Form.Item label={<span style={{ color: 'white' }}>Width</span>}>
                                <InputNumber value={width} onChange={v => v && setWidth(v)} style={{ width: 120 }} />
                            </Form.Item>
                            <Form.Item label={<span style={{ color: 'white' }}>Height</span>}>
                                <InputNumber value={height} onChange={v => v && setHeight(v)} style={{ width: 120 }} />
                            </Form.Item>
                        </Form>
                        <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: 8 }}>
                            <Text style={{ color: '#aaa', fontSize: '12px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {outputPath || "Default: Same as source"}
                            </Text>
                            <Button size="small" onClick={handleSetOutputPath}>Set Output Path</Button>
                        </Space>
                    </Space>
                </Card>

                <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    size="large"
                    block
                    onClick={handleBatchProcess}
                    loading={processing}
                    disabled={!filePath || segments.length === 0}
                    style={{ background: '#13c2c2', borderColor: '#13c2c2' }}
                >
                    {processing ? currentStep : "Run Automation Pipeline"}
                </Button>

                {processing && (
                    <div style={{ marginTop: 8 }}>
                        <div style={{ color: '#ccc', marginBottom: 4 }}>{currentStep}</div>
                        <Progress percent={Math.round(progress)} status="active" strokeColor={{ from: '#13c2c2', to: '#52c41a' }} />
                    </div>
                )}

                {finalFile && (
                    <div style={{ padding: '1rem', background: '#112a14', borderRadius: '8px', border: '1px solid #237804' }}>
                        <Text type="success" strong>Done! Output: {finalFile}</Text>
                    </div>
                )}
            </Space>
        </Card>
    );
};

export default AutoPanel;

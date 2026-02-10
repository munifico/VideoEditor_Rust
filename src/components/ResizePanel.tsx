import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button, Card, Typography, Space, message, InputNumber, Form, Progress, notification, List } from 'antd';
import { ExpandOutlined, PlusOutlined, DeleteOutlined, FileAddOutlined } from '@ant-design/icons';
import { useProgress } from '../hooks/useProgress';

const { Text } = Typography;

interface ResizePanelProps {
    filePath: string | null;
    totalDuration: number;
}

const ResizePanel: React.FC<ResizePanelProps> = ({ filePath, totalDuration }) => {
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState<string[]>([]);
    const [width, setWidth] = useState<number>(1280);
    const [height, setHeight] = useState<number>(720);
    const { progress, resetProgress } = useProgress();

    // Batch state
    const [batchFiles, setBatchFiles] = useState<string[]>([]);

    useEffect(() => {
        if (filePath && batchFiles.length === 0) {
            // Optional: Auto-add global file logic if needed
        }
    }, [filePath]);

    const handleAddFiles = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: 'Videos',
                    extensions: ['mp4', 'mkv', 'mov', 'webm']
                }]
            });
            if (selected) {
                if (Array.isArray(selected)) {
                    setBatchFiles(prev => {
                        const combined = [...prev, ...selected];
                        return Array.from(new Set(combined)); // Deduplicate
                    });
                } else if (typeof selected === 'string') {
                    setBatchFiles(prev => Array.from(new Set([...prev, selected])));
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRemoveFile = (index: number) => {
        setBatchFiles(batchFiles.filter((_, i) => i !== index));
    };

    const handleAddCurrentFile = () => {
        if (filePath && !batchFiles.includes(filePath)) {
            setBatchFiles(prev => [...prev, filePath]);
        }
    };

    const handleResize = async () => {
        // Determine targets: Batch List OR Single Global File
        let targets = batchFiles.length > 0 ? batchFiles : (filePath ? [filePath] : []);

        if (targets.length === 0) {
            message.warning("Please select files to resize.");
            return;
        }

        setProcessing(true);
        resetProgress();
        setResults([]);
        const createdFiles: string[] = [];

        try {
            for (let i = 0; i < targets.length; i++) {
                const targetPath = targets[i];
                // For progress, if it's the global file, we know duration. If not, we don't.
                // We'll pass 0 for unknown duration. Backend handles it gracefullly or defaults.
                const durationForThis = (targetPath === filePath) ? totalDuration : 0;

                const output = await invoke<string>('resize_video', {
                    input: targetPath,
                    width,
                    height,
                    totalDuration: durationForThis
                });
                createdFiles.push(output);
            }

            setResults(createdFiles);
            notification.success({
                message: 'Batch Resize Complete',
                description: `Resized ${createdFiles.length} files successfully!`,
            });
        } catch (err) {
            console.error(err);
            message.error(`Resize failed: ${err}`);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Card title={
            <div>
                <Text style={{ color: 'white', display: 'block' }}>Batch Resize Video</Text>
                <Text style={{ color: '#888', fontSize: '12px', fontWeight: 'normal' }}>Change the resolution of your videos individually or in batch.</Text>
            </div>
        } bordered={false} style={{ background: 'transparent', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>

                {/* File Selection Area */}
                <div style={{ padding: '1rem', background: '#1f1f1f', borderRadius: '8px', border: '1px dashed #444' }}>

                    {/* Toolbar */}
                    <Space style={{ marginBottom: '1rem' }}>
                        <Button icon={<FileAddOutlined />} onClick={handleAddFiles}>Add Files</Button>
                        <Button icon={<PlusOutlined />} onClick={handleAddCurrentFile} disabled={!filePath}>Add Current Video</Button>
                        <Text style={{ color: '#888' }}>
                            {batchFiles.length} file(s) selected
                        </Text>
                    </Space>

                    {/* Batch List */}
                    {batchFiles.length > 0 ? (
                        <List
                            size="small"
                            dataSource={batchFiles}
                            renderItem={(item, index) => (
                                <List.Item
                                    actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFile(index)} />]}
                                    style={{ color: 'white' }}
                                >
                                    <Text style={{ color: '#ccc', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item}
                                    </Text>
                                </List.Item>
                            )}
                            style={{ maxHeight: '200px', overflowY: 'auto', background: '#141414' }}
                        />
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem' }}>
                            <Text style={{ color: '#555' }}>
                                {filePath ? `Current: ${filePath} (Click 'Add Current' to include)` : "No files selected."}
                            </Text>
                        </div>
                    )}
                </div>

                <Card style={{ background: '#141414', borderColor: '#303030' }}>
                    <Space direction="vertical" align="center" style={{ width: '100%' }}>
                        <Space style={{ marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Button size="small" onClick={() => { setWidth(1920); setHeight(1080); }}>Movie (1080p)</Button>
                            <Button size="small" onClick={() => { setWidth(1366); setHeight(768); }}>Laptop</Button>
                            <Button size="small" onClick={() => { setWidth(1280); setHeight(800); }}>Tablet</Button>
                            <Button size="small" onClick={() => { setWidth(1080); setHeight(1920); }}>Mobile</Button>

                            <Button size="small" type="dashed" onClick={() => {
                                localStorage.setItem('customResize', JSON.stringify({ w: width, h: height }));
                                message.success('Custom preset saved');
                            }}>Save Custom</Button>

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
                        <Form layout="inline" style={{ justifyContent: 'center' }}>
                            <Form.Item label={<span style={{ color: 'white' }}>Width</span>}>
                                <InputNumber
                                    min={100}
                                    max={7680}
                                    value={width}
                                    onChange={(v) => { if (v) setWidth(v); }}
                                    style={{ width: 120 }}
                                />
                            </Form.Item>
                            <Form.Item label={<span style={{ color: 'white' }}>Height</span>}>
                                <InputNumber
                                    min={100}
                                    max={4320}
                                    value={height}
                                    onChange={(v) => { if (v) setHeight(v); }}
                                    style={{ width: 120 }}
                                />
                            </Form.Item>
                        </Form>
                    </Space>
                </Card>

                <Button
                    block
                    type="primary"
                    icon={<ExpandOutlined />}
                    onClick={handleResize}
                    disabled={(!filePath && batchFiles.length === 0) || processing}
                    loading={processing}
                    size="large"
                    style={{ background: '#faad14', borderColor: '#faad14', color: 'black' }}
                >
                    {processing ? `Processing ${batchFiles.length > 0 ? 'Batch' : 'Video'}...` : 'Resize All'}
                </Button>

                {processing && <Progress percent={Math.round(progress)} status="active" strokeColor={{ from: '#faad14', to: '#f5222d' }} />}

                {results.length > 0 && (
                    <div style={{ padding: '1rem', background: '#112a14', borderRadius: '8px', border: '1px solid #237804' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <Text type="success" strong>Success! Output Files:</Text>
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

export default ResizePanel;

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Button, Card, Typography, Space, message, List, Progress, notification } from 'antd';
import { MergeCellsOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useProgress } from '../hooks/useProgress';

const { Text, Paragraph } = Typography;

const MergePanel: React.FC = () => {
    const [files, setFiles] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<string>('');
    const { progress, resetProgress } = useProgress();

    const handleAddFiles = async () => {
        try {
            const selected = await open({
                multiple: true,
                filters: [{
                    name: 'Video',
                    extensions: ['mp4', 'mkv', 'avi', 'mov']
                }]
            });

            if (selected) {
                if (Array.isArray(selected)) {
                    setFiles(prev => [...prev, ...selected]);
                } else {
                    setFiles(prev => [...prev, selected as string]);
                }
            }
        } catch (err) {
            console.error(err);
            message.error('Failed to open file dialog');
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            message.warning('Please select at least 2 videos to merge.');
            return;
        }

        setProcessing(true);
        resetProgress();
        setResult('');

        try {
            // Invoke the Rust command
            // merge_videos(window, inputs, total_duration)
            // Provide dummy duration for now
            const output = await invoke<string>('merge_videos', {
                inputs: files,
                totalDuration: 100.0,
            });

            setResult(output);
            notification.success({
                message: 'Merge Complete',
                description: 'Videos merged successfully!',
            });
        } catch (err) {
            console.error(err);
            message.error(`Merge failed: ${err}`);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Card title={
            <div>
                <Text style={{ color: 'white', display: 'block' }}>Merge Videos</Text>
                <Text style={{ color: '#888', fontSize: '12px', fontWeight: 'normal' }}>Combine multiple video files into a single continuous video.</Text>
            </div>
        } bordered={false} style={{ background: 'transparent', width: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={handleAddFiles}
                    style={{ height: '60px', borderColor: '#444', color: '#aeaeae' }}
                >
                    Add Videos to Merge List
                </Button>

                <List
                    style={{ background: '#1f1f1f', borderRadius: '8px', border: '1px solid #303030' }}
                    bordered
                    dataSource={files}
                    renderItem={(item, index) => (
                        <List.Item
                            actions={[<Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemoveFile(index)} />]}
                        >
                            <Text style={{ color: 'white', wordBreak: 'break-all' }}>{item}</Text>
                        </List.Item>
                    )}
                    locale={{ emptyText: <Text style={{ color: '#555' }}>No videos added yet</Text> }}
                />

                <Button
                    block
                    type="primary"
                    icon={<MergeCellsOutlined />}
                    onClick={handleMerge}
                    disabled={files.length < 2 || processing}
                    loading={processing}
                    size="large"
                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                    Merge {files.length} Videos
                </Button>

                {processing && <Progress percent={Math.round(progress)} status="active" strokeColor={{ from: '#722ed1', to: '#eb2f96' }} />}

                {result && (
                    <div style={{ padding: '1rem', background: '#112a14', borderRadius: '8px', border: '1px solid #237804' }}>
                        <Text type="success" strong>Success!</Text>
                        <Paragraph style={{ color: '#b7eb8f', margin: 0, wordBreak: 'break-all' }}>
                            Output saved to: {result}
                        </Paragraph>
                    </div>
                )}
            </Space>
        </Card>
    );
};

export default MergePanel;

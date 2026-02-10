import React from 'react';
import { Button, Typography, Card, Space, message } from 'antd';
import { FileOutlined } from '@ant-design/icons';
import { open } from '@tauri-apps/plugin-dialog';

const { Text } = Typography;

interface FileLoaderProps {
    onFileSelect: (path: string) => void;
    selectedFile: string | null;
}

const FileLoader: React.FC<FileLoaderProps> = ({ onFileSelect, selectedFile }) => {
    const handleOpenFile = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'Video',
                    extensions: ['mp4', 'mkv', 'avi', 'mov']
                }]
            });

            if (selected) {
                onFileSelect(selected as string);
            }
        } catch (err) {
            console.error(err);
            message.error('Failed to open file dialog');
        }
    };

    return (
        <Card
            style={{
                width: '100%',
                background: '#141414',
                borderColor: '#303030',
                marginBottom: '1rem'
            }}
        >
            <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    type="primary"
                    icon={<FileOutlined />}
                    onClick={handleOpenFile}
                    size="large"
                >
                    Select Video
                </Button>

                {selectedFile ? (
                    <div style={{ background: '#1f1f1f', padding: '0.5rem 1rem', borderRadius: '8px', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Text style={{ color: '#aeaeae', marginRight: '8px' }}>Selected:</Text>
                        <Text strong style={{ color: 'white' }} title={selectedFile}>{selectedFile}</Text>
                    </div>
                ) : (
                    <Text style={{ color: '#555' }}>No file selected</Text>
                )}
            </Space>
        </Card>
    );
};

export default FileLoader;

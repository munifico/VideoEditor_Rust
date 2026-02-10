import { useState, useRef } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Layout, Tabs, theme, ConfigProvider } from 'antd';
import { ScissorOutlined, ExpandOutlined, MergeCellsOutlined, RobotOutlined } from '@ant-design/icons';
import './App.css';

import FileLoader from './components/FileLoader';
import TrimPanel from './components/TrimPanel';
import ResizePanel from './components/ResizePanel';
import MergePanel from './components/MergePanel';
import AutoPanel from './components/AutoPanel';

const { Content, Footer } = Layout;


function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('1');
  const [duration, setDuration] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    token: { borderRadiusLG },
  } = theme.useToken();

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setDuration(e.currentTarget.duration);
    console.log("Video loaded. Duration:", e.currentTarget.duration);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error("Video Error:", e.nativeEvent);
  };

  const items = [
    {
      key: '1',
      label: 'Trim',
      children: <TrimPanel filePath={filePath} videoRef={videoRef} />,
      icon: <ScissorOutlined />,
    },
    {
      key: '2',
      label: 'Resize',
      children: <ResizePanel filePath={filePath} totalDuration={duration} />,
      icon: <ExpandOutlined />,
    },
    {
      key: '3',
      label: 'Merge',
      children: <MergePanel />,
      icon: <MergeCellsOutlined />,
    },
    {
      key: '4',
      label: 'Auto',
      children: <AutoPanel filePath={filePath} videoRef={videoRef} />,
      icon: <RobotOutlined />,
    },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          // Optional: Customize tokens if needed
          colorPrimary: '#1890ff',
        }
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#000' }}>
        {/* Header Removed as requested */}

        <Content style={{ padding: '24px', background: '#000' }}>
          <div
            style={{
              // Removed maxWidth: '1200px' to allow full width consistency across panels
              // margin: '0 auto', 
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}
          >
            <FileLoader
              onFileSelect={setFilePath}
              selectedFile={filePath}
            />

            {/* Global Video Player */}
            {filePath && activeTab !== '3' && (
              <div style={{ background: '#141414', padding: '12px', borderRadius: '8px', border: '1px solid #303030' }}>
                <video
                  ref={videoRef}
                  key={filePath}
                  controls
                  style={{ width: '100%', maxHeight: '450px', borderRadius: '4px', backgroundColor: 'black' }}
                  src={convertFileSrc(filePath)}
                  onLoadedMetadata={handleMetadataLoaded}
                  onError={handleVideoError}
                />
              </div>
            )}

            <div
              style={{
                background: '#141414',
                minHeight: 280,
                padding: 24,
                borderRadius: borderRadiusLG,
                border: '1px solid #303030'
              }}
            >
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                items={items}
                destroyInactiveTabPane={true}
                type="card"
                size="large"
                tabBarStyle={{ marginBottom: '24px' }}
              />
            </div>
          </div>
        </Content>
        <Footer style={{ textAlign: 'center', background: '#000', color: '#444', borderTop: '1px solid #222' }}>
          Video Editor Pro ©{new Date().getFullYear()} Created with Tauri
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}

export default App;

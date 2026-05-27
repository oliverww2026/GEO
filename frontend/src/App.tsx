import { Layout, Space, Typography, Dropdown } from 'antd';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import './App.css';

const { Header, Content } = Layout;
const { Text } = Typography;

/** 内部布局 - 需要在 Router 内部才能用 useNavigate */
function AppLayout() {
  const { isAuthenticated, user, enterprise, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isAdmin = user?.role === 'admin';

  const userMenuItems = [
    { key: 'enterprise', label: `企业: ${enterprise?.brandName || user?.displayName || ''}`, disabled: true },
    { key: 'role', label: `角色: ${isAdmin ? '管理员' : '员工'}`, disabled: true },
    { key: 'divider', type: 'divider' as const },
    ...(isAdmin
      ? [
        { key: 'admin', label: '管理后台', icon: <SettingOutlined />, onClick: () => navigate('/admin') },
      ]
      : []),
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 50px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
          GEO 智测工具
        </div>
        {isAuthenticated && user && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <UserOutlined />
              <Text>{user.displayName}</Text>
            </Space>
          </Dropdown>
        )}
      </Header>
      <Content style={{ padding: '24px 50px' }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* 首页需要登录才能访问 */}
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/result" element={
            <ProtectedRoute><ResultPage /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
          } />
        </Routes>
      </Content>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
import { Layout, Space, Typography, Dropdown } from 'antd';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import PaySuccessPage from './pages/PaySuccessPage';
import './App.css';

const { Header, Content } = Layout;
const { Text } = Typography;

// 不需要顶部 Header 的路由（产品首页自带导航栏）
const NO_HEADER_PATHS = ['/', '/login', '/register'];

/** 内部布局 - 需要在 Router 内部才能用 useNavigate / useLocation */
function AppLayout() {
  const { isAuthenticated, user, enterprise, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const isAdmin = user?.role === 'admin';
  const showHeader = !NO_HEADER_PATHS.includes(location.pathname);

  const userMenuItems = [
    { key: 'enterprise', label: `企业: ${enterprise?.brandName || user?.displayName || ''}`, disabled: true },
    { key: 'role', label: `角色: ${isAdmin ? '管理员' : '员工'}`, disabled: true },
    { key: 'divider', type: 'divider' as const },
    { key: 'profile', label: '个人中心', onClick: () => navigate('/profile') },
    ...(isAdmin
      ? [{ key: 'admin', label: '管理后台', icon: <SettingOutlined />, onClick: () => navigate('/admin') }]
      : []),
    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
  ];

  // 产品首页、登录页、注册页：不渲染 Layout，直接全屏
  if (!showHeader) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    );
  }

  // 应用内页面：带顶部 Header
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
        <div
          style={{ fontSize: '20px', fontWeight: 800, color: '#4F46E5', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          逗你玩AI · GEO智测
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
          {/* 检测主页（原 /，现在移到 /app） */}
          <Route path="/app" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/result" element={
            <ProtectedRoute><ResultPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
          } />
          <Route path="/pay-success" element={
            <ProtectedRoute><PaySuccessPage /></ProtectedRoute>
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

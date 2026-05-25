import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, KeyOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';

const { Title, Text } = Typography;

function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleRegister = async (values: {
    inviteCode: string;
    username: string;
    password: string;
    displayName: string;
  }) => {
    setLoading(true);
    try {
      const result = await register(
        values.inviteCode,
        values.username,
        values.password,
        values.displayName
      );

      if (!result.success) {
        message.error(result.message);
        return;
      }

      message.success('注册成功，正在自动登录...');

      // 自动登录
      const loginResult = await login(values.username, values.password);
      if (loginResult.success) {
        navigate('/', { replace: true });
      } else {
        message.warning('注册成功但自动登录失败，请手动登录');
        navigate('/login', { replace: true });
      }
    } catch {
      message.error('注册异常，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
    }}>
      <Card
        style={{
          width: 420,
          boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
              注册账号
            </Title>
            <Text type="secondary">填写企业邀请码即可加入</Text>
          </div>

          <Form
            name="register"
            onFinish={handleRegister}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="inviteCode"
              rules={[{ required: true, message: '请输入企业邀请码' }]}
            >
              <Input
                prefix={<KeyOutlined />}
                placeholder="企业邀请码"
              />
            </Form.Item>

            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20位字母、数字或下划线' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名（3-20位字母数字）"
              />
            </Form.Item>

            <Form.Item
              name="displayName"
              rules={[{ required: true, message: '请输入显示名称' }]}
            >
              <Input
                prefix={<IdcardOutlined />}
                placeholder="显示名称"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码（至少6位）"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: '请确认密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="确认密码"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{ height: 44 }}
              >
                注 册
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              已有账号？<Link to="/login">返回登录</Link>
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
}

export default RegisterPage;
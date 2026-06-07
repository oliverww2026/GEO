import { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Button, Tag, Table, Space, message, Spin, Empty } from 'antd';
import { CrownOutlined, ThunderboltOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../config/env';

const PRIMARY = '#4F46E5';

interface QuotaInfo {
  limitToday: number;
  usedToday: number;
  allowed: boolean;
  planType?: string;
  planExpireAt?: string;
}

interface Order {
  id: number;
  planType: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // 获取配额信息
      const quotaRes = await fetch(`${API_BASE_URL}/pay/quota`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const quotaData = await quotaRes.json();
      if (quotaData.success) {
        setQuota(quotaData.data);
      }

      // 获取订单列表
      const ordersRes = await fetch(`${API_BASE_URL}/pay/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const ordersData = await ordersRes.json();
      if (ordersData.success) {
        setOrders(ordersData.data);
      }
    } catch (err) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const getPlanName = (type?: string) => {
    const map: Record<string, string> = {
      single: '单次检测',
      monthly: '月度会员',
      yearly: '年度会员',
    };
    return map[type || ''] || '免费版';
  };

  const getPlanIcon = (type?: string) => {
    if (type === 'yearly') return <CrownOutlined style={{ color: '#10B981' }} />;
    if (type === 'monthly') return <CrownOutlined style={{ color: PRIMARY }} />;
    return <ThunderboltOutlined style={{ color: '#F59E0B' }} />;
  };

  const columns = [
    {
      title: '套餐',
      dataIndex: 'planType',
      key: 'planType',
      render: (type: string) => (
        <Space>
          {getPlanIcon(type)}
          <span>{getPlanName(type)}</span>
        </Space>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => `¥${(amount / 100).toFixed(2)}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; label: string }> = {
          pending: { color: 'orange', label: '待支付' },
          paid: { color: 'green', label: '已支付' },
          expired: { color: 'red', label: '已过期' },
        };
        const s = statusMap[status] || { color: 'default', label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
    },
  ];

  if (loading) {
    return <Spin style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }} />;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* 用户信息 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12}>
            <div>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 4 }}>用户名</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>
                {user?.displayName || user?.username}
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div>
              <div style={{ color: '#64748B', fontSize: 12, marginBottom: 4 }}>用户ID</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>
                {user?.userId}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 配额统计 */}
      {quota && (
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="当前套餐"
                value={getPlanName(quota.planType)}
                prefix={getPlanIcon(quota.planType)}
                valueStyle={{ color: PRIMARY, fontSize: 16 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="今日使用次数"
                value={quota.usedToday}
                suffix={`/ ${quota.limitToday}`}
                valueStyle={{ color: quota.allowed ? '#10B981' : '#EF4444', fontSize: 16 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="套餐有效期"
                value={quota.planExpireAt ? new Date(quota.planExpireAt).toLocaleDateString('zh-CN') : '永久'}
                prefix={<CalendarOutlined />}
                valueStyle={{ fontSize: 16 }}
              />
            </Col>
          </Row>

          {!quota.allowed && (
            <div style={{
              marginTop: 16,
              padding: 12,
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: 8,
              color: '#92400E',
              fontSize: 14,
            }}>
              <CheckCircleOutlined style={{ marginRight: 8 }} />
              今日免费次数已用完，升级套餐继续使用
            </div>
          )}
        </Card>
      )}

      {/* 订单历史 */}
      <Card title="订单历史">
        {orders.length === 0 ? (
          <Empty description="暂无订单" />
        ) : (
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    </div>
  );
}

import { useState } from 'react';
import { Modal, Button, Card, Tag, Space, Typography, Spin, message, Row, Col } from 'antd';
import { CheckCircleOutlined, CrownOutlined, ThunderboltOutlined, StarOutlined } from '@ant-design/icons';
import { API_BASE_URL } from '../config/env';

const { Title, Text, Paragraph } = Typography;

const PRIMARY = '#4F46E5';

interface Plan {
  key: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  highlight: boolean;
  icon: React.ReactNode;
  features: string[];
}

const PLANS: Plan[] = [
  {
    key: 'monthly',
    name: '阅读会员',
    price: '¥149',
    period: '/ 月',
    badge: '最受欢迎',
    highlight: true,
    icon: <CrownOutlined style={{ color: PRIMARY, fontSize: 22 }} />,
    features: ['每天 10 次检测', '完整分析报告', '改写建议 & FAQ', '渠道适配分析', '历史记录查询'],
  },
  {
    key: 'yearly',
    name: '年度会员',
    price: '¥1499',
    period: '/ 年',
    highlight: false,
    icon: <StarOutlined style={{ color: '#10B981', fontSize: 22 }} />,
    features: ['每天不限次检测', '完整分析报告', '改写建议 & FAQ', '渠道适配分析', '历史记录查询'],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onPaySuccess?: () => void;
  /** 触发原因：quota_exceeded = 次数用完 */
  reason?: 'quota_exceeded';
}

export default function PaywallModal({ open, onClose, onPaySuccess, reason }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/pay/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planType: selectedPlan }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        message.error(data.message || '创建订单失败，请稍后重试');
        return;
      }

      // 跳转到虎皮椒支付页面
      window.open(data.data.payUrl, '_blank');

      // 轮询支付状态（最多等 5 分钟）
      const outTradeNo = data.data.outTradeNo;
      let attempts = 0;
      const maxAttempts = 60; // 每 5 秒一次，最多 5 分钟

      const poll = setInterval(async () => {
        attempts++;
        try {
          const qRes = await fetch(`${API_BASE_URL}/pay/query/${outTradeNo}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const qData = await qRes.json();

          if (qData.success && qData.data.status === 'paid') {
            clearInterval(poll);
            message.success('支付成功！套餐已激活 🎉');
            onPaySuccess?.();
            onClose();
          }
        } catch { /* ignore */ }

        if (attempts >= maxAttempts) {
          clearInterval(poll);
          message.warning('支付超时，如已付款请刷新页面');
        }
      }, 5000);

    } catch (err) {
      message.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      title={null}
      styles={{ body: { padding: '32px 24px' } }}
    >
      {/* 标题区 */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        {reason === 'quota_exceeded' && (
          <Tag color="orange" style={{ marginBottom: 12, padding: '4px 12px', borderRadius: 20 }}>
            今日免费次数已用完
          </Tag>
        )}
        <Title level={3} style={{ color: '#0F172A', marginBottom: 8 }}>
          升级套餐，继续使用
        </Title>
        <Paragraph style={{ color: '#64748B', marginBottom: 0 }}>
          选择适合你的套餐，立即解锁更多检测次数
        </Paragraph>
      </div>

      {/* 套餐卡片 */}
      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        {PLANS.map(plan => (
          <Col key={plan.key} xs={24} sm={8}>
            <Card
              onClick={() => setSelectedPlan(plan.key)}
              style={{
                cursor: 'pointer',
                borderRadius: 12,
                border: selectedPlan === plan.key
                  ? `2px solid ${PRIMARY}`
                  : plan.highlight ? `1px solid ${PRIMARY}` : '1px solid #E2E8F0',
                background: selectedPlan === plan.key ? '#EEF2FF' : '#fff',
                position: 'relative',
                transition: 'all 0.2s',
              }}
              bodyStyle={{ padding: '16px 14px' }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: PRIMARY, color: '#fff',
                  padding: '2px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}
              <Space style={{ marginBottom: 8 }}>
                {plan.icon}
                <Text strong style={{ color: '#0F172A' }}>{plan.name}</Text>
              </Space>
              <div style={{ marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: selectedPlan === plan.key ? PRIMARY : '#0F172A' }}>
                  {plan.price}
                </span>
                <span style={{ color: '#64748B', fontSize: 13 }}>{plan.period}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {plan.features.map(f => (
                  <li key={f} style={{ fontSize: 12, color: '#64748B', padding: '2px 0' }}>
                    <CheckCircleOutlined style={{ color: '#10B981', marginRight: 6 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 支付按钮 */}
      <Button
        type="primary" block size="large"
        loading={loading}
        onClick={handlePay}
        style={{
          background: PRIMARY, borderColor: PRIMARY,
          height: 48, fontSize: 16, fontWeight: 600, borderRadius: 10,
        }}
      >
        {loading ? '正在跳转支付...' : `立即支付 ${PLANS.find(p => p.key === selectedPlan)?.price}`}
      </Button>

      <div style={{ textAlign: 'center', marginTop: 12, color: '#94A3B8', fontSize: 12 }}>
        支付后自动激活 · 支持微信/支付宝 · 如有问题请联系客服
      </div>
    </Modal>
  );
}

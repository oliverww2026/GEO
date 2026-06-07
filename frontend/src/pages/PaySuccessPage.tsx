import { useNavigate, useSearchParams } from 'react-router-dom';
import { Result, Button, Space } from 'antd';

const PLAN_NAME: Record<string, string> = {
  single: '单次检测',
  monthly: '月度会员',
  yearly: '年度会员',
};

export default function PaySuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const plan = params.get('plan') || '';

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <Result
        status="success"
        title="支付成功！🎉"
        subTitle={`${PLAN_NAME[plan] || '套餐'}已激活，立即开始使用吧`}
        extra={
          <Space>
            <Button type="primary" onClick={() => navigate('/app')}
              style={{ background: '#4F46E5', borderColor: '#4F46E5' }}>
              开始检测
            </Button>
            <Button onClick={() => navigate('/profile')}>查看我的套餐</Button>
          </Space>
        }
      />
    </div>
  );
}

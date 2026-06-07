import { Button, Typography, Row, Col, Card, Tag, Divider, Space } from 'antd';
import {
  RocketOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  BulbOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  ArrowRightOutlined,
  StarFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph, Text } = Typography;

// ── 颜色常量 ──────────────────────────────────────────────
const PRIMARY = '#4F46E5';
const PRIMARY_LIGHT = '#EEF2FF';
const ACCENT = '#06B6D4';
const DARK = '#0F172A';
const GRAY = '#64748B';

// ── 特性卡片数据 ──────────────────────────────────────────
const features = [
  {
    icon: <BarChartOutlined style={{ fontSize: 28, color: PRIMARY }} />,
    title: '六维度精准评分',
    desc: '从信源权威性、内容类型、数据丰富度、品牌锚点、篇幅匹配、营销风险六个维度全面量化内容质量。',
  },
  {
    icon: <BulbOutlined style={{ fontSize: 28, color: '#F59E0B' }} />,
    title: '多模型友好度分析',
    desc: '同时评估 ChatGPT、Claude、Gemini、Perplexity 等主流 AI 模型的召回概率，找到最优投放策略。',
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 28, color: '#10B981' }} />,
    title: '营销词风险检测',
    desc: '自动识别强/中/弱三级营销词汇，量化扣分，帮你规避 AI 过滤风险，提升内容可信度。',
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 28, color: '#EF4444' }} />,
    title: 'AI 驱动改写建议',
    desc: '针对低分段落给出具体改写方案、数据溯源补充、FAQ 问答设计，一键优化内容结构。',
  },
  {
    icon: <CheckCircleOutlined style={{ fontSize: 28, color: ACCENT }} />,
    title: '渠道适配分析',
    desc: '根据你选择的投放渠道（官网/小红书/公众号等），给出差异化的优化建议和适配模型推荐。',
  },
  {
    icon: <RocketOutlined style={{ fontSize: 28, color: '#8B5CF6' }} />,
    title: '一句话结论输出',
    desc: '每次分析生成一句话核心结论，快速判断内容是否达到 AI 引用标准，节省决策时间。',
  },
];

// ── 使用步骤 ──────────────────────────────────────────────
const steps = [
  { num: '01', title: '填写品牌信息', desc: '输入品牌名称、定位和服务城市，让 AI 了解你的业务背景。' },
  { num: '02', title: '粘贴内容文本', desc: '将你的文章、产品介绍或营销文案粘贴到输入框。' },
  { num: '03', title: '选择投放渠道', desc: '勾选你计划发布的平台，如官网、小红书、公众号等。' },
  { num: '04', title: '获取完整报告', desc: '约 3 分钟内生成评分报告、改写建议和渠道策略。' },
];

// ── 定价方案 ──────────────────────────────────────────────
const plans = [
  {
    name: '免费体验',
    price: '¥0',
    period: '',
    highlight: false,
    features: ['每天 1 次免费检测', '基础六维度评分', '营销词检测', '一句话结论'],
    cta: '免费开始',
  },
  {
    name: '单次购买',
    price: '¥9.9',
    period: '/ 次',
    highlight: false,
    features: ['立即可用 1 次检测', '完整分析报告', '改写建议 & FAQ', '渠道适配分析'],
    cta: '立即购买',
  },
  {
    name: '月度会员',
    price: '¥49',
    period: '/ 月',
    highlight: true,
    badge: '最受欢迎',
    features: ['每天 10 次检测', '完整分析报告', '改写建议 & FAQ', '渠道适配分析', '历史记录查询'],
    cta: '开通会员',
  },
  {
    name: '年度会员',
    price: '¥399',
    period: '/ 年',
    highlight: false,
    features: ['每天不限次检测', '完整分析报告', '改写建议 & FAQ', '渠道适配分析', '历史记录查询', '优先客服支持'],
    cta: '开通年费',
  },
];

// ── 用户评价 ──────────────────────────────────────────────
const testimonials = [
  {
    name: '张总',
    role: '某连锁门店市场总监',
    content: '用了 GEO 智测之后，我们的品牌内容在 AI 搜索里的曝光率明显提升，客户说"问 AI 就能找到我们"。',
    stars: 5,
  },
  {
    name: '李老师',
    role: '独立内容创作者',
    content: '以前写完文章不知道 AI 会不会引用，现在有了量化评分，改哪里、怎么改都很清楚，效率提升了很多。',
    stars: 5,
  },
  {
    name: '王经理',
    role: '本地生活服务商',
    content: '营销词检测功能特别实用，帮我们规避了很多"最好最强"这类被 AI 过滤的词，内容质量明显提升。',
    stars: 5,
  },
];

// ── 主组件 ────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#fff', overflowX: 'hidden' }}>

      {/* ── 导航栏 ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #E2E8F0',
        padding: '0 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: PRIMARY, letterSpacing: '-0.5px' }}>
          逗你玩AI · GEO智测
        </div>
        <Space size={12}>
          <Button type="text" onClick={() => navigate('/login')} style={{ color: GRAY }}>登录</Button>
          <Button type="primary" onClick={() => navigate('/register')}
            style={{ background: PRIMARY, borderColor: PRIMARY, borderRadius: 8 }}>
            免费开始
          </Button>
        </Space>
      </header>

      {/* ── Hero 区 ── */}
      <section style={{
        background: `linear-gradient(135deg, ${PRIMARY_LIGHT} 0%, #F0F9FF 50%, #ECFDF5 100%)`,
        padding: '80px 40px 100px',
        textAlign: 'center',
      }}>
        <Tag color="blue" style={{ marginBottom: 20, padding: '4px 14px', borderRadius: 20, fontSize: 13 }}>
          🚀 AI 时代内容优化工具
        </Tag>
        <Title style={{
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 900,
          color: DARK,
          lineHeight: 1.15,
          marginBottom: 20,
          letterSpacing: '-1px',
        }}>
          让你的内容被 AI 主动引用<br />
          <span style={{ color: PRIMARY }}>而不是被过滤忽略</span>
        </Title>
        <Paragraph style={{ fontSize: 18, color: GRAY, maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.8 }}>
          GEO 智测工具基于 GEO（生成式引擎优化）理论，从六个维度量化评估你的内容，
          帮助品牌在 ChatGPT、Claude、Gemini 等 AI 搜索中获得更高曝光。
        </Paragraph>
        <Space size={16} wrap style={{ justifyContent: 'center' }}>
          <Button
            type="primary" size="large"
            icon={<ArrowRightOutlined />}
            onClick={() => navigate('/login?redirect=%2Fapp')}
            style={{
              background: PRIMARY, borderColor: PRIMARY,
              height: 52, padding: '0 32px', fontSize: 16,
              borderRadius: 10, fontWeight: 600,
            }}
          >
            免费体验一次
          </Button>
          <Button
            size="large"
            onClick={() => navigate('/login')}
            style={{ height: 52, padding: '0 32px', fontSize: 16, borderRadius: 10 }}
          >
            已有账号，去登录
          </Button>
        </Space>
        <div style={{ marginTop: 24, color: GRAY, fontSize: 13 }}>
          ✅ 无需信用卡 &nbsp;·&nbsp; ✅ 每天 1 次免费 &nbsp;·&nbsp; ✅ 3 分钟出报告
        </div>
      </section>

      {/* ── 数据亮点 ── */}
      <section style={{ background: PRIMARY, padding: '48px 40px' }}>
        <Row gutter={[32, 32]} justify="center">
          {[
            { num: '6', label: '评分维度' },
            { num: '5+', label: '主流 AI 模型覆盖' },
            { num: '3min', label: '平均出报告时间' },
            { num: '100+', label: '营销词库词条' },
          ].map(item => (
            <Col key={item.label} xs={12} sm={6} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{item.num}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', marginTop: 8, fontSize: 14 }}>{item.label}</div>
            </Col>
          ))}
        </Row>
      </section>

      {/* ── 功能特性 ── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Title level={2} style={{ color: DARK, fontWeight: 800 }}>为什么选择 GEO 智测？</Title>
          <Paragraph style={{ color: GRAY, fontSize: 16 }}>
            专为 AI 搜索时代设计，帮助你的内容在生成式 AI 中脱颖而出
          </Paragraph>
        </div>
        <Row gutter={[24, 24]}>
          {features.map(f => (
            <Col key={f.title} xs={24} sm={12} lg={8}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 16, height: '100%',
                  boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                hoverable
              >
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <Title level={5} style={{ color: DARK, marginBottom: 8 }}>{f.title}</Title>
                <Paragraph style={{ color: GRAY, marginBottom: 0, lineHeight: 1.7 }}>{f.desc}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      <Divider style={{ margin: 0 }} />

      {/* ── 使用步骤 ── */}
      <section style={{ padding: '80px 40px', background: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Title level={2} style={{ color: DARK, fontWeight: 800 }}>4 步完成内容优化</Title>
          <Paragraph style={{ color: GRAY, fontSize: 16 }}>简单易用，无需技术背景</Paragraph>
        </div>
        <Row gutter={[32, 32]} justify="center" style={{ maxWidth: 900, margin: '0 auto' }}>
          {steps.map((s, i) => (
            <Col key={s.num} xs={24} sm={12} md={6} style={{ textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: PRIMARY_LIGHT, color: PRIMARY,
                fontSize: 20, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                {s.num}
              </div>
              <Title level={5} style={{ color: DARK }}>{s.title}</Title>
              <Paragraph style={{ color: GRAY, fontSize: 14, lineHeight: 1.7 }}>{s.desc}</Paragraph>
              {i < steps.length - 1 && (
                <div style={{ display: 'none' }} />
              )}
            </Col>
          ))}
        </Row>
      </section>

      {/* ── 定价 ── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Title level={2} style={{ color: DARK, fontWeight: 800 }}>简单透明的定价</Title>
          <Paragraph style={{ color: GRAY, fontSize: 16 }}>从免费开始，按需升级</Paragraph>
        </div>
        <Row gutter={[24, 24]} justify="center">
          {plans.map(plan => (
            <Col key={plan.name} xs={24} sm={12} lg={6}>
              <Card
                bordered={false}
                style={{
                  borderRadius: 16, height: '100%', textAlign: 'center',
                  border: plan.highlight ? `2px solid ${PRIMARY}` : '1px solid #E2E8F0',
                  boxShadow: plan.highlight ? `0 8px 32px rgba(79,70,229,0.15)` : '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative', overflow: 'visible',
                }}
              >
                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: PRIMARY, color: '#fff',
                    padding: '3px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    {plan.badge}
                  </div>
                )}
                <Title level={4} style={{ color: DARK, marginBottom: 8 }}>{plan.name}</Title>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: plan.highlight ? PRIMARY : DARK }}>
                    {plan.price}
                  </span>
                  <span style={{ color: GRAY, fontSize: 14 }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24, textAlign: 'left' }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ padding: '5px 0', color: GRAY, fontSize: 14 }}>
                      <CheckCircleOutlined style={{ color: '#10B981', marginRight: 8 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  type={plan.highlight ? 'primary' : 'default'}
                  block size="large"
                  onClick={() => navigate('/register')}
                  style={{
                    borderRadius: 8, fontWeight: 600,
                    ...(plan.highlight ? { background: PRIMARY, borderColor: PRIMARY } : {}),
                  }}
                >
                  {plan.cta}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* ── 用户评价 ── */}
      <section style={{ padding: '80px 40px', background: '#FAFAFA' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Title level={2} style={{ color: DARK, fontWeight: 800 }}>用户怎么说</Title>
        </div>
        <Row gutter={[24, 24]} justify="center" style={{ maxWidth: 1000, margin: '0 auto' }}>
          {testimonials.map(t => (
            <Col key={t.name} xs={24} md={8}>
              <Card bordered={false} style={{ borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', height: '100%' }}>
                <Space style={{ marginBottom: 12 }}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <StarFilled key={i} style={{ color: '#F59E0B', fontSize: 14 }} />
                  ))}
                </Space>
                <Paragraph style={{ color: DARK, lineHeight: 1.8, marginBottom: 16 }}>
                  "{t.content}"
                </Paragraph>
                <div>
                  <Text strong style={{ color: DARK }}>{t.name}</Text>
                  <br />
                  <Text style={{ color: GRAY, fontSize: 13 }}>{t.role}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* ── CTA 底部召唤 ── */}
      <section style={{
        background: `linear-gradient(135deg, ${PRIMARY} 0%, #7C3AED 100%)`,
        padding: '80px 40px',
        textAlign: 'center',
      }}>
        <Title style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(24px, 4vw, 40px)', marginBottom: 16 }}>
          现在就开始优化你的内容
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 36 }}>
          每天 1 次免费检测，无需信用卡，注册即用
        </Paragraph>
        <Button
          size="large"
          onClick={() => navigate('/register')}
          style={{
            height: 52, padding: '0 40px', fontSize: 16,
            borderRadius: 10, fontWeight: 700,
            background: '#fff', color: PRIMARY, border: 'none',
          }}
        >
          免费注册 →
        </Button>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: DARK, color: 'rgba(255,255,255,0.5)',
        padding: '32px 40px', textAlign: 'center', fontSize: 13,
      }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ color: '#fff', fontWeight: 700, marginRight: 16 }}>逗你玩AI</span>
          <span style={{ marginRight: 16 }}>GEO 智测 · AI 内容优化工具</span>
        </div>
        <div>© 2025 逗你玩AI · 让内容被 AI 看见</div>
      </footer>

    </div>
  );
}

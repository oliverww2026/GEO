import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Alert,
  Table,
  Progress,
  Collapse,
  Anchor,
  Affix,
  Statistic,
  Badge,
  Popover,
  message
} from 'antd'
import {
  ArrowLeftOutlined,
  ThunderboltFilled,
  AimOutlined,
  FundOutlined,
  BulbOutlined,
  AlertOutlined,
  CompassOutlined,
  ExperimentOutlined,
  RocketOutlined,
  DashboardOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
  FilePdfOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import type { AnalysisResult, ModelScore } from '../types'
import { parseMarkdownWithTable } from '../utils/markdownTableParser'

const { Title, Text, Paragraph } = Typography

// 营销词 → 替换建议 映射表
const REPLACEMENT_MAP: Record<string, string> = {
  '标杆': '行业参考标准',
  '引领者': '较早进入该领域',
  '颠覆性': '显著创新',
  '革命性': '重大突破',
  '第一': '首批之一',
  '最佳': '优选方案',
  '顶级': '优质',
  '首选': '优先考虑的选项',
  '唯一': '少数之一',
  '开创者': '早期探索者',
  '领军': '主要参与者',
  '巅峰': '高水平',
  '王者': '领先行列',
  'NO.1': '头部',
  '先行者': '较早布局的企业之一',
  '价值标杆': '行业参考',
  '行业领先': '行业中具有一定规模的',
  '权威认证': '具备完整资质公示的',
  '值得信赖': '具有完整资质公示的',
  '专业团队': '具备多年从业经验的团队',
  '放心之选': '可考虑的选项',
  '实力雄厚': '具备一定规模的',
  '品质保证': '通过标准流程保障品质',
  '用心服务': '提供标准化服务流程',
  '卓越品质': '较高品质标准',
  '匠心打造': '历经打磨的',
  '行业话语权': '在行业内有影响力',
  '出色': '表现良好',
  '高效触达': '快速覆盖',
  '优质': '符合标准的',
  '高端': '定位较高的',
  '精选': '经过筛选的',
  '贴心': '周到的',
  '专业': '有经验的',
  '放心': '可参考的',
  '靠谱': '经过验证的',
}

// 维度标签配置
const DIMENSION_LABELS: Record<string, { name: string; weight: string; icon: React.ReactNode }> = {
  authority: { name: '信源权威性', weight: '30%', icon: <AimOutlined /> },
  contentType: { name: '内容类型匹配', weight: '25%', icon: <DashboardOutlined /> },
  dataRichness: { name: '数据丰富度', weight: '15%', icon: <FundOutlined /> },
  brandAnchor: { name: '品牌锚点强度', weight: '10%', icon: <ThunderboltFilled /> },
  length: { name: '篇幅匹配度', weight: '10%', icon: <RocketOutlined /> },
  marketingRisk: { name: '营销语气风险', weight: '10%', icon: <AlertOutlined /> },
}

// 导航锚点配置
const NAV_SECTIONS = [
  { key: 'summary', title: '🎯 一句话结论', icon: <BulbOutlined /> },
  { key: 'cores', title: '📊 核心数据', icon: <DashboardOutlined /> },
  { key: 'models', title: '🤖 模型友好度', icon: <RocketOutlined /> },
  { key: 'dimensions', title: '📈 维度评分', icon: <FundOutlined /> },
  { key: 'marketing', title: '⚠️ 营销词检测', icon: <AlertOutlined /> },
  { key: 'suggestions', title: '💡 优化建议', icon: <BulbOutlined /> },
  { key: 'channels', title: '📍 渠道分析', icon: <CompassOutlined /> },
  { key: 'probe', title: '📡 探针验证', icon: <ExperimentOutlined /> },
]

function ResultPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const reportRef = useRef<HTMLDivElement>(null)
  const [, setActiveKey] = useState<string>('summary')

  const analysisResult = location.state as AnalysisResult | null
  const storedResult = localStorage.getItem('analysisResult')
  const recoveredResult = storedResult ? JSON.parse(storedResult) : null
  const finalResult = analysisResult || recoveredResult

  // 滚动监听 - 高亮当前导航
  useEffect(() => {
    const handleScroll = () => {
      const sections = NAV_SECTIONS.map(s => s.key)
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(`section-${sections[i]}`)
        if (el) {
          const rect = el.getBoundingClientRect()
          if (rect.top <= 130) {
            setActiveKey(sections[i])
            break
          }
        }
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!finalResult) {
    return (
      <Card>
        <Alert
          message="未找到分析数据"
          description="请从首页提交分析后再查看结果，或检查数据传递是否正确"
          type="error"
          showIcon
          action={<Button type="primary" onClick={() => navigate('/')}>返回首页</Button>}
        />
      </Card>
    )
  }

  const isValidResult = finalResult &&
    finalResult.overallScore !== undefined &&
    finalResult.modelScores && finalResult.modelScores.length > 0

  if (!isValidResult) {
    return (
      <Card>
        <Alert
          message="分析数据不完整"
          description="返回数据格式异常，请重新提交分析"
          type="warning"
          showIcon
          action={<Button type="primary" onClick={() => navigate('/')}>重新分析</Button>}
        />
      </Card>
    )
  }

  const result = finalResult!

  // ========== 工具函数 ==========
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'strong': return '#52c41a'
      case 'medium': return '#faad14'
      case 'weak': return '#f5222d'
      default: return '#d9d9d9'
    }
  }

  const getLevelText = (level: string) => {
    switch (level) {
      case 'strong': return '🟢 强'
      case 'medium': return '🟡 中'
      case 'weak': return '🔴 弱'
      default: return level
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#52c41a'
    if (score >= 55) return '#faad14'
    return '#f5222d'
  }

  const getReplacement = (word: string) => REPLACEMENT_MAP[word] || '使用客观事实描述替代'

  // 导出报告（打印为 PDF）
  const handleExportPDF = () => {
    message.info('正在准备打印，请在打印对话框中选择"另存为 PDF"')
    setTimeout(() => window.print(), 300)
  }

  // 各模型按友好度排序（弱→强）
  const sortedModels = [...result.modelScores].sort((a, b) => {
    const order: Record<string, number> = { weak: 0, medium: 1, strong: 2 }
    return order[a.level] - order[b.level]
  })

  // 维度评分排序（低→高）
  const sortedDimensions = (Object.entries(result.dimensionScores) as [string, number][])
    .sort(([, a], [, b]) => a - b)

  // 构造营销词替换表数据
  const marketingTableData = [
    ...result.marketingWords?.strong?.map((item: { word: string; count: number }) => ({
      word: item.word,
      level: '🔴 强',
      levelType: 'strong' as const,
      count: item.count,
      penalty: item.count * 15,
      replacement: getReplacement(item.word),
    })) || [],
    ...result.marketingWords?.medium?.map((item: { word: string; count: number }) => ({
      word: item.word,
      level: '🟡 中',
      levelType: 'medium' as const,
      count: item.count,
      penalty: item.count * 8,
      replacement: getReplacement(item.word),
    })) || [],
    ...result.marketingWords?.weak?.map((item: { word: string; count: number }) => ({
      word: item.word,
      level: '🟢 弱',
      levelType: 'weak' as const,
      count: item.count,
      penalty: item.count * 3,
      replacement: getReplacement(item.word),
    })) || [],
  ].sort((a, b) => b.penalty - a.penalty)

  // 营销词统计
  const totalStrong = result.marketingWords?.strong?.length || 0
  const totalMedium = result.marketingWords?.medium?.length || 0
  const totalWeak = result.marketingWords?.weak?.length || 0
  const totalPenalty = result.marketingWords?.totalPenalty || 0
  const hasMarketingWords = totalStrong + totalMedium + totalWeak > 0

  // 渠道分析数据
  const channelAnalysisData = result.channelAnalysis || []

  // 优化建议详情
  const optimizationDetails = result.optimizationDetails || {
    rewriteSuggestions: [],
    dataTraceSuggestions: [],
    structureEnhancement: '',
    faqSuggestions: [],
    competitorComparison: [],
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', gap: 24 }}>
      {/* ========== 左侧导航 ========== */}
      <Affix offsetTop={80} style={{ zIndex: 100 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <Card size="small" title="📋 报告目录">
            <Anchor
              affix={false}
              targetOffset={130}
              items={NAV_SECTIONS.map(s => ({
                key: s.key,
                href: `#section-${s.key}`,
                title: (
                  <Space size={4} wrap={false}>
                    {s.icon}
                    <span>{s.title.split(' ').slice(1).join(' ')}</span>
                  </Space>
                ),
              }))}
              onChange={(link) => {
                const key = link.replace('#section-', '')
                if (key) setActiveKey(key)
              }}
              style={{ padding: 0 }}
            />
          </Card>
        </div>
      </Affix>

      {/* ========== 主内容区 ========== */}
      <div ref={reportRef} style={{ flex: 1, minWidth: 0 }} id="print-area">
        {/* 顶部操作栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>返回首页</Button>
          <Space>
            <Button icon={<FilePdfOutlined />} onClick={handleExportPDF}>导出 PDF 报告</Button>
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => navigate('/')}>重新分析</Button>
          </Space>
        </div>

        {/* ====== 1. 一句话结论 ====== */}
        <Card
          id="section-summary"
          style={{
            marginBottom: 24,
            borderLeft: `4px solid ${getScoreColor(result.overallScore)}`,
            background: result.overallScore >= 75 ? '#f6ffed' : result.overallScore >= 55 ? '#fffbe6' : '#fff1f0'
          }}
        >
          <Space size="middle" style={{ width: '100%' }}>
            <BulbOutlined style={{ fontSize: 28, color: getScoreColor(result.overallScore) }} />
            <div style={{ flex: 1 }}>
              <Title level={3} style={{ margin: 0, color: '#262626' }}>
                🎯 一句话结论
              </Title>
              <Paragraph style={{ margin: '8px 0 0', fontSize: 16, color: '#595959' }}>
                {result.oneSentenceSummary || `${result.overallScore >= 75 ? '内容质量优秀' : result.overallScore >= 55 ? '内容质量中等' : '内容质量偏低'}，综合评分 ${result.overallScore} 分，整体召回友好度 ${getLevelText(result.friendlinessLevel)}`}
              </Paragraph>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, fontWeight: 'bold', lineHeight: 1, color: getScoreColor(result.overallScore) }}>
                {result.overallScore}
              </div>
              <Text type="secondary">/ 100 分</Text>
            </div>
          </Space>
        </Card>

        {/* ====== 2. 核心数据 ====== */}
        <Card id="section-cores" title={<Title level={4} style={{ margin: 0 }}>📊 核心数据</Title>} style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  fontSize: 48, fontWeight: 'bold',
                  color: getScoreColor(result.overallScore),
                  lineHeight: 1.2
                }}>{result.overallScore}</div>
                <Text type="secondary" style={{ fontSize: 14 }}>综合评分</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Badge status={getLevelBadge(result.friendlinessLevel).status} />
                <div style={{ fontSize: 32, fontWeight: 'bold', lineHeight: 1.2, marginTop: 8 }}>
                  {getLevelText(result.friendlinessLevel)}
                </div>
                <Text type="secondary" style={{ fontSize: 14 }}>召回友好度</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 48, fontWeight: 'bold', color: '#1890ff', lineHeight: 1.2 }}>
                  {result.wordCount?.toLocaleString() || '—'}
                </div>
                <Text type="secondary" style={{ fontSize: 14 }}>总字数</Text>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 48, fontWeight: 'bold', color: '#52c41a', lineHeight: 1.2 }}>
                  {result.modelScores.filter((m: ModelScore) => m.level === 'strong').length}
                </div>
                <Text type="secondary" style={{ fontSize: 14 }}>强友好模型数</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* ====== 3. 各模型友好度一览（从弱到强排列） ====== */}
        <Card
          id="section-models"
          title={<Title level={4} style={{ margin: 0 }}>🤖 各模型友好度一览</Title>}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            {sortedModels.map((model: ModelScore, index: number) => {
              const badge = getLevelBadge(model.level)
              return (
                <Col key={index} xs={24} sm={12} md={6}>
                  <Popover
                    content={
                      <div style={{ maxWidth: 300 }}>
                        <Text strong>{model.reason || '暂无详细原因'}</Text>
                        {model.keyIssues && model.keyIssues.length > 0 && (
                          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                            {model.keyIssues.map((issue: string, i: number) => (
                              <li key={i} style={{ fontSize: 12, color: '#595959' }}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    }
                    title={`${model.modelName} · 诊断详情`}
                    trigger="hover"
                    placement="bottom"
                  >
                    <Card
                      size="small"
                      hoverable
                      style={{
                        borderLeft: `4px solid ${getLevelColor(model.level)}`,
                        background: model.level === 'strong' ? '#f6ffed' :
                          model.level === 'medium' ? '#fffbe6' : '#fff1f0',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      styles={{
                        body: { padding: '16px' }
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: 14 }}>{model.modelName}</Text>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 32, fontWeight: 'bold', color: getLevelColor(model.level) }}>
                            {model.score}
                          </span>
                          <Text type="secondary" style={{ fontSize: 12 }}>分</Text>
                        </div>
                        <Badge status={badge.status} text={badge.text} />
                        {model.keyIssues && model.keyIssues.length > 0 && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            <InfoCircleOutlined /> {model.keyIssues[0]}
                          </Text>
                        )}
                      </Space>
                    </Card>
                  </Popover>
                </Col>
              )
            })}
          </Row>
        </Card>

        {/* ====== 4. 各维度评分详情 ====== */}
        <Card
          id="section-dimensions"
          title={<Title level={4} style={{ margin: 0 }}>📈 各维度评分详情</Title>}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={[16, 16]}>
            {sortedDimensions.map(([key, value]) => {
              const dim = DIMENSION_LABELS[key] || { name: key, weight: '', icon: null }
              const level = value >= 75 ? 'strong' : value >= 55 ? 'medium' : 'weak'
              return (
                <Col key={key} xs={24} sm={12} lg={8}>
                  <Card
                    size="small"
                    style={{
                      borderLeft: `4px solid ${getLevelColor(level)}`,
                      background: level === 'strong' ? '#f6ffed' :
                        level === 'medium' ? '#fffbe6' : '#fff1f0',
                    }}
                    styles={{ body: { padding: '20px' } }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Space>
                        {dim.icon}
                        <Text strong>{dim.name}</Text>
                      </Space>
                      <Tag color={level === 'strong' ? 'success' : level === 'medium' ? 'warning' : 'error'}>
                        {dim.weight}
                      </Tag>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                      <span style={{ fontSize: 36, fontWeight: 'bold', color: getLevelColor(level) }}>
                        {value}
                      </span>
                      <Text type="secondary" style={{ fontSize: 14 }}>分</Text>
                    </div>
                    <Progress
                      percent={value}
                      strokeColor={getLevelColor(level)}
                      showInfo={false}
                      size="small"
                      style={{ marginBottom: 4 }}
                    />
                    <Badge status={getLevelBadge(level).status} text={getLevelBadge(level).text} />
                  </Card>
                </Col>
              )
            })}
          </Row>
        </Card>

        {/* ====== 5. 营销词命中检测表 ====== */}
        <Card
          id="section-marketing"
          title={<Title level={4} style={{ margin: 0 }}>⚠️ 营销词命中检测表</Title>}
          style={{ marginBottom: 24 }}
        >
          {!hasMarketingWords ? (
            <Alert
              message="未检测到营销敏感词"
              description="内容用语较为客观，继续保持！"
              type="success"
              showIcon
              icon={<InfoCircleOutlined />}
            />
          ) : (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {/* 总览卡片 */}
              <Row gutter={16}>
                <Col span={6}>
                  <Card size="small" style={{ background: '#fff1f0', borderLeft: '4px solid #f5222d' }}>
                    <Statistic title="强营销词" value={totalStrong} suffix="个" valueStyle={{ color: '#f5222d' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>每次扣15分</Text>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: '#fff7e6', borderLeft: '4px solid #faad14' }}>
                    <Statistic title="中营销词" value={totalMedium} suffix="个" valueStyle={{ color: '#faad14' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>每次扣8分</Text>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: '#fffbe6', borderLeft: '4px solid #faad14' }}>
                    <Statistic title="弱营销词" value={totalWeak} suffix="个" valueStyle={{ color: '#d48806' }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>每次扣3分</Text>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" style={{ background: '#fff1f0', borderLeft: '4px solid #f5222d' }}>
                    <Statistic
                      title="总扣分"
                      value={totalPenalty}
                      suffix="分"
                      prefix={<ArrowDownOutlined />}
                      valueStyle={{ color: '#f5222d' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>营销语气风险：{result.dimensionScores.marketingRisk}分</Text>
                  </Card>
                </Col>
              </Row>

              {/* 替换建议表 */}
              <div>
                <Text strong style={{ fontSize: 15 }}>📝 替换建议</Text>
                <Text type="secondary" style={{ marginLeft: 8 }}>（点击"建议"列可直接复制替换词）</Text>
                <Table
                  dataSource={marketingTableData}
                  pagination={false}
                  size="small"
                  style={{ marginTop: 12 }}
                  columns={[
                    {
                      title: '原文词汇',
                      dataIndex: 'word',
                      key: 'word',
                      width: 120,
                      render: (t: string, record: any) => (
                        <Tag color={record.levelType === 'strong' ? 'red' : record.levelType === 'medium' ? 'orange' : 'gold'}
                          style={{ fontSize: 13, padding: '2px 10px' }}>
                          {t}
                        </Tag>
                      )
                    },
                    {
                      title: '等级',
                      dataIndex: 'level',
                      key: 'level',
                      width: 80,
                    },
                    {
                      title: '出现次数',
                      dataIndex: 'count',
                      key: 'count',
                      width: 80,
                      render: (c: number) => <Text strong style={{ color: '#f5222d' }}>×{c}</Text>
                    },
                    {
                      title: '单项扣分',
                      dataIndex: 'penalty',
                      key: 'penalty',
                      width: 80,
                      render: (p: number) => (
                        <Text type="danger" strong>-{p}分</Text>
                      )
                    },
                    {
                      title: '建议替换为',
                      dataIndex: 'replacement',
                      key: 'replacement',
                      render: (t: string) => (
                        <Paragraph
                          copyable={{ text: t, tooltips: ['复制', '已复制！'] }}
                          style={{ margin: 0, color: '#52c41a', fontSize: 13 }}
                        >
                          {t}
                        </Paragraph>
                      )
                    },
                  ]}
                />
              </div>
            </Space>
          )}
        </Card>

        {/* ====== 6. 优化建议详情 ====== */}
        <Card
          id="section-suggestions"
          title={<Title level={4} style={{ margin: 0 }}>💡 优化建议详情</Title>}
          style={{ marginBottom: 24 }}
        >
          <Collapse
            defaultActiveKey={['1', '2', '3', '4', '5']}
            items={[
              {
                key: '1',
                label: <Text strong>📝 具体改写方案</Text>,
                children: optimizationDetails.rewriteSuggestions.length === 0 ? (
                  <Alert message="无建议，此内容OK" type="success" showIcon />
                ) : (
                  <Table
                    dataSource={optimizationDetails.rewriteSuggestions.map((r: any, i: number) => ({ ...r, key: i }))}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '位置', dataIndex: 'position', key: 'position', width: 100 },
                      { title: '原文', dataIndex: 'originalText', key: 'originalText', width: 200 },
                      {
                        title: '改后内容',
                        dataIndex: 'suggestedText',
                        key: 'suggestedText',
                        width: 200,
                        render: (t: string) => (
                          <Paragraph copyable={{ text: t }} style={{ margin: 0, color: '#52c41a' }}>{t}</Paragraph>
                        )
                      },
                      { title: '修改原因', dataIndex: 'reason', key: 'reason' },
                    ]}
                  />
                )
              },
              {
                key: '2',
                label: <Text strong>📊 数据溯源补充方案</Text>,
                children: optimizationDetails.dataTraceSuggestions.length === 0 ? (
                  <Alert message="无建议，此内容OK" type="success" showIcon />
                ) : (
                  <Table
                    dataSource={optimizationDetails.dataTraceSuggestions.map((d: any, i: number) => ({ ...d, key: i }))}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '现有数据', dataIndex: 'existingData', key: 'existingData', width: 150 },
                      { title: '当前表述', dataIndex: 'currentExpression', key: 'currentExpression', width: 200 },
                      {
                        title: '建议补充来源',
                        dataIndex: 'suggestedSource',
                        key: 'suggestedSource',
                        render: (t: string) => (
                          <Paragraph copyable={{ text: t }} style={{ margin: 0, color: '#52c41a' }}>{t}</Paragraph>
                        )
                      },
                    ]}
                  />
                )
              },
              {
                key: '3',
                label: <Text strong>🏗️ 结构化增强建议</Text>,
                children: (() => {
                  const enhanced = optimizationDetails.structureEnhancement
                  if (!enhanced || enhanced.trim() === '') {
                    return <Alert message="无建议，此内容OK" type="success" showIcon />
                  }
                  const parsed = parseMarkdownWithTable(enhanced)
                  return (
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      {parsed.beforeText && (
                        <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>
                          {parsed.beforeText}
                        </Paragraph>
                      )}
                      {parsed.table && (
                        <Table
                          dataSource={parsed.table.dataSource.map((row, i) => ({ ...row, key: i }))}
                          columns={parsed.table.columns}
                          pagination={false}
                          size="small"
                          bordered
                          style={{ margin: 0 }}
                        />
                      )}
                      {parsed.afterText && (
                        <Paragraph style={{ whiteSpace: 'pre-line', margin: 0 }}>
                          {parsed.afterText}
                        </Paragraph>
                      )}
                      <Paragraph copyable={{ text: enhanced }} style={{ margin: 0 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>原始文本（可复制）</Text>
                      </Paragraph>
                    </Space>
                  )
                })(),
              },
              {
                key: '4',
                label: <Text strong>❓ 高频问答FAQ</Text>,
                children: optimizationDetails.faqSuggestions.length === 0 ? (
                  <Alert message="无建议，此内容OK" type="success" showIcon />
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    {optimizationDetails.faqSuggestions.map((faq: any, i: number) => (
                      <Card key={i} size="small" style={{ background: '#fafafa' }}>
                        <Text strong style={{ color: '#1890ff' }}>Q: {faq.question}</Text>
                        <Paragraph style={{ margin: '8px 0 0', paddingLeft: 16 }} copyable={{ text: faq.answer }}>
                          A: {faq.answer}
                        </Paragraph>
                      </Card>
                    ))}
                  </Space>
                )
              },
              {
                key: '5',
                label: <Text strong>🔍 竞品内容对比参考</Text>,
                children: optimizationDetails.competitorComparison.length === 0 ? (
                  <Alert message="无建议，此内容OK" type="success" showIcon />
                ) : (
                  <Table
                    dataSource={optimizationDetails.competitorComparison.map((c: any, i: number) => ({ ...c, key: i }))}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: '对比维度', dataIndex: 'dimension', key: 'dimension', width: 120 },
                      { title: '本文现状', dataIndex: 'currentStatus', key: 'currentStatus', width: 200 },
                      { title: '行业优质内容基线', dataIndex: 'industryBaseline', key: 'industryBaseline', width: 200 },
                      {
                        title: '差距',
                        dataIndex: 'gap',
                        key: 'gap',
                        render: (t: string) => <Text type="danger">{t}</Text>
                      },
                    ]}
                  />
                )
              },
            ]}
          />
        </Card>

        {/* ====== 7. 渠道利弊分析 ====== */}
        <Card
          id="section-channels"
          title={<Title level={4} style={{ margin: 0 }}>📍 渠道利弊分析</Title>}
          style={{ marginBottom: 24 }}
        >
          {channelAnalysisData.length === 0 ? (
            <Alert message="未提供投放渠道信息" type="info" showIcon />
          ) : (
            <Row gutter={[16, 16]}>
              {channelAnalysisData.map((ch: any, i: number) => (
                <Col key={i} xs={24} sm={12} lg={8}>
                  <Card
                    size="small"
                    title={<Text strong>{ch.channel}</Text>}
                    styles={{ body: { padding: '12px 16px' } }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <Text type="success" strong style={{ fontSize: 13 }}>
                        <ArrowUpOutlined /> 利好
                      </Text>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {ch.advantages?.map((adv: string, j: number) => (
                          <li key={j} style={{ fontSize: 13, color: '#52c41a' }}>{adv}</li>
                        ))}
                        {(!ch.advantages || ch.advantages.length === 0) && (
                          <li style={{ fontSize: 13, color: '#999' }}>暂无明确优势</li>
                        )}
                      </ul>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="danger" strong style={{ fontSize: 13 }}>
                        <ArrowDownOutlined /> 利空
                      </Text>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {ch.disadvantages?.map((dis: string, j: number) => (
                          <li key={j} style={{ fontSize: 13, color: '#f5222d' }}>{dis}</li>
                        ))}
                        {(!ch.disadvantages || ch.disadvantages.length === 0) && (
                          <li style={{ fontSize: 13, color: '#999' }}>暂无明确劣势</li>
                        )}
                      </ul>
                    </div>
                    {ch.suitableModels && ch.suitableModels.length > 0 && (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>适配模型：</Text>
                        <Space size={[0, 4]} wrap style={{ marginTop: 4 }}>
                          {ch.suitableModels.map((sm: string, j: number) => (
                            <Tag key={j} color="blue" style={{ fontSize: 11 }}>{sm}</Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>

        {/* ====== 8. 探针验证提醒与风险声明 ====== */}
        <Card
          id="section-probe"
          title={<Title level={4} style={{ margin: 0 }}>📡 探针验证提醒与风险声明</Title>}
          style={{ marginBottom: 24 }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Alert
              message="📡 发布后验证节点"
              description={
                <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                  <li>发布后 <strong>1个月</strong>：在目标模型中搜索相关黄金回收问题，观察是否召回本文</li>
                  <li>发布后 <strong>3个月</strong>：记录各模型的引用情况，与本次分析预期做对比</li>
                  <li>发布后 <strong>6个月</strong>：综合评估 SEO+GEO 效果，决定是否需要重写或调整投放策略</li>
                </ul>
              }
              type="info"
              showIcon
            />

            {result.riskWarning ? (
              <Alert
                message="⚠️ 分析不确定性说明"
                description={
                  <div style={{ whiteSpace: 'pre-line', fontSize: 13 }}>
                    {result.riskWarning}
                  </div>
                }
                type="warning"
                showIcon
              />
            ) : (
              <Alert
                message="⚠️ 风险声明"
                description="本次分析基于当前AI模型的一般性规律，实际召回效果可能因模型更新、内容上下文等因素而有所差异。建议结合实际投放效果进行验证和调整。"
                type="warning"
                showIcon
              />
            )}

            <Alert
              message="💡 提示"
              description="本工具的判断基于三类依据：🟢 生态逻辑（高可信）、🟡 内容结构偏好（中等可信）、🟠 具体规律假设（待验证）。产品的可信度来自'诚实的不确定性'，而不是'精确的假数据'。"
              type="success"
              showIcon
            />
          </Space>
        </Card>

        {/* 底部操作 */}
        <Space style={{ width: '100%', justifyContent: 'center', marginBottom: 40 }}>
          <Button size="large" icon={<FilePdfOutlined />} onClick={handleExportPDF}>导出 PDF 报告</Button>
          <Button size="large" type="primary" icon={<ReloadOutlined />} onClick={() => navigate('/')}>重新分析</Button>
        </Space>
      </div>

      {/* 打印样式 */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .ant-affix { display: none !important; }
          .ant-btn { display: none !important; }
          .ant-statistic-content { font-size: inherit !important; }
        }
      `}</style>
    </div>
  )
}

// 辅助函数
function getLevelBadge(level: string) {
  switch (level) {
    case 'strong': return { status: 'success' as const, text: '🟢 强' }
    case 'medium': return { status: 'warning' as const, text: '🟡 中' }
    case 'weak': return { status: 'error' as const, text: '🔴 弱' }
    default: return { status: 'default' as const, text: level }
  }
}

export default ResultPage
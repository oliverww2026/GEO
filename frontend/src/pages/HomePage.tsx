import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config/env'
import { useAuth } from '../auth/AuthContext'
import {
  Card,
  Form,
  Input,
  Checkbox,
  Button,
  message,
  Space,
  Typography,
  Progress
} from 'antd'

const { TextArea } = Input
const { Title, Text } = Typography

// 可用的投放渠道
const CHANNELS = [
  '今日头条',
  '抖音',
  '微信公众号',
  '知乎',
  '百度',
  '其他门户',
  '渠道未定（按基线评估）'
]

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 300000 // 5分钟
const CONNECTION_CHECK_TIMEOUT = 5000 // 5秒快速检测后端连通性

function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated, getAuthHeaders, enterprise, user } = useAuth()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [contentLength, setContentLength] = useState(0)
  const [progressPercent, setProgressPercent] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const progressTimerRef = useRef<number | null>(null)

  /**
   * 基于真实时间的进度条
   * 使用对数曲线：前30秒快速到40%，然后缓慢增长至95%
   * 只在 API 真正返回时才到 100%
   */
  const startRealProgress = useCallback(() => {
    const startTime = Date.now()
    setProgressPercent(0)

    const tick = () => {
      const elapsed = Date.now() - startTime
      // 对数曲线：progress = 100 * log10(1 + 9 * elapsed / maxTime) / log10(10)
      // 约简化为分段线性 + 渐近逼近 95%
      const maxTime = 300000 // 5分钟对应 95%
      const ratio = Math.min(elapsed / maxTime, 1)
      // 使用平方根曲线让前期增长快后期慢
      const percent = Math.round(95 * Math.sqrt(ratio))
      setProgressPercent(percent)

      if (elapsed < maxTime) {
        progressTimerRef.current = window.setTimeout(tick, 2000) // 每2秒更新
      }
    }

    tick()
  }, [])

  const stopProgress = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearTimeout(progressTimerRef.current)
      progressTimerRef.current = null
    }
  }, [])

  /**
   * 快速检测后端连通性
   */
  const checkBackendConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), CONNECTION_CHECK_TIMEOUT)
      await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return true
    } catch {
      return false
    }
  }, [])

  const handleAnalyze = async (values: any) => {
    try {
      setLoading(true)

      // 验证必填项
      if (!values.content || values.content.trim().length === 0) {
        message.error('请输入要分析的内容')
        setLoading(false)
        return
      }

      if (!values.channels || values.channels.length === 0) {
        message.error('请至少选择一个投放渠道')
        setLoading(false)
        return
      }

      // 构建品牌配置：登录用户从企业信息读取，未登录用表单值
      const brandName = enterprise?.brandName || values.brandName || '未设置'
      const brandPosition = enterprise?.brandPosition || values.brandPosition || ''
      const serviceCity = enterprise?.serviceCity || values.serviceCity || ''

      // 销毁之前的消息，然后显示新的 loading
      message.destroy()
      message.loading('正在连接后端服务...', 0)

      // 快速检测后端连通性
      const isBackendAlive = await checkBackendConnectivity()
      if (!isBackendAlive) {
        message.destroy()
        message.error('后端服务未启动，请运行 ./start-production.sh 启动服务后再试', 8)
        setLoading(false)
        return
      }

      message.destroy()
      message.loading('正在分析内容，AI 模型处理中请耐心等待...', 0)

      // 启动真实进度条
      startRealProgress()

      // 根据登录状态选择 API 端点：未登录用公开接口
      const apiUrl = isAuthenticated
        ? `${API_BASE_URL}/analysis`
        : `${API_BASE_URL}/analysis/public`

      console.log('发送请求地址:', apiUrl)
      console.log('请求参数:', {
        brandConfig: {
          brandName,
          brandPosition: values.brandPosition || brandPosition,
          serviceCity: values.serviceCity || serviceCity
        },
        content: values.content,
        channels: values.channels
      })

      // 创建 AbortController 用于超时控制
      const controller = new AbortController()
      abortControllerRef.current = controller
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      // 构建请求头：已登录带上 token，未登录不带
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (isAuthenticated) {
        Object.assign(headers, getAuthHeaders())
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          brandConfig: {
            brandName,
            brandPosition,
            serviceCity
          },
          content: values.content,
          channels: values.channels
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      console.log('响应状态:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API请求失败:', errorText)
        message.destroy()
        message.error(`分析失败：${errorText || 'API请求错误'}`)
        setLoading(false)
        stopProgress()
        return
      }

      const result = await response.json()

      console.log('完整分析结果:', result)

      // 增加数据验证和详细日志
      if (!result || !result.data) {
        console.error('返回数据异常:', result)
        message.destroy()
        message.error('返回的分析数据异常')
        setLoading(false)
        stopProgress()
        return
      }

      message.destroy()
      setProgressPercent(100)
      stopProgress()
      message.success('分析完成！')

      // 将API返回的data传递到结果页面
      console.log('传递到结果页的数据:', result.data)

      // 同时存储到 localStorage
      localStorage.setItem('analysisResult', JSON.stringify(result.data))

      navigate('/result', {
        state: result.data
      })

    } catch (error: any) {
      console.error('请求处理异常:', error)
      message.destroy()
      if (error.name === 'AbortError') {
        message.error('分析超时（超过5分钟），请缩短内容后重试或联系技术支持', 8)
      } else if (error.message === 'Failed to fetch' || error.message?.includes('fetch')) {
        message.error('无法连接到后端服务，请确认服务已启动', 8)
      } else {
        message.error(`分析失败：${error.message || '请重试'}`, 8)
      }
    } finally {
      setLoading(false)
      stopProgress()
      setProgressPercent(0)
      abortControllerRef.current = null
    }
  }

  // 取消分析
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    stopProgress()
    message.destroy()
    message.info('已取消分析')
    setLoading(false)
    setProgressPercent(0)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContentLength(e.target.value.length)
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card style={{ marginBottom: 24 }}>
        <Title level={2}>GEO 智能检测助手</Title>
        <Text type="secondary">
          评估内容对 AI 模型召回品牌的友好程度，识别内容与投放策略弱点，提供可执行的优化建议
        </Text>
        <div style={{
          marginTop: 16,
          padding: '12px 16px',
          background: '#f0f5ff',
          borderRadius: 4,
          border: '1px solid #adc6ff'
        }}>
          <Text style={{ color: '#1890ff' }}>
            ℹ️ 当前企业：<Text strong>{enterprise?.brandName || user?.displayName || '免登录模式'}</Text>
            {enterprise?.serviceCity && <span> | 服务城市：{enterprise.serviceCity}</span>}
            {!isAuthenticated && <span> | <Text type="secondary">无需登录，直接使用</Text></span>}
          </Text>
        </div>
      </Card>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleAnalyze}
      >
        {/* 步骤1：内容输入 */}
        <Card title="【步骤1】内容输入" style={{ marginBottom: 24 }}>
          <Form.Item
            label={
              <Space>
                <span>输入要分析的内容</span>
                <Text type="secondary">（当前字数：{contentLength}）</Text>
              </Space>
            }
            name="content"
            rules={[
              { required: true, message: '请输入要分析的内容' },
              { min: 100, message: '内容至少需要100字' }
            ]}
          >
            <TextArea
              rows={12}
              placeholder="请粘贴您要分析的文章内容..."
              onChange={handleContentChange}
              showCount
              maxLength={10000}
            />
          </Form.Item>

          <Text type="secondary">
            💡 提示：支持粘贴文章、广告文案、公众号内容等。建议内容不少于500字以获得更准确的分析结果。
          </Text>
        </Card>

        {/* 步骤2：投放渠道 */}
        <Card title="【步骤2】投放渠道" style={{ marginBottom: 24 }}>
          <Form.Item
            name="channels"
            rules={[{ required: true, message: '请至少选择一个投放渠道' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Space direction="vertical" size="middle">
                {CHANNELS.map(channel => (
                  <Checkbox key={channel} value={channel}>
                    {channel}
                  </Checkbox>
                ))}
              </Space>
            </Checkbox.Group>
          </Form.Item>

          <Text type="secondary">
            💡 提示：选择"渠道未定"将按基线50分评估渠道匹配度
          </Text>
        </Card>

        {/* 进度条（分析中显示） */}
        {loading && (
          <Card style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Text strong>AI 正在分析您的内容...</Text>
              <Progress percent={progressPercent} status="active" strokeColor="#1890ff" />
              <Text type="secondary">
                提示：AI 分析需要 2-4 分钟，请耐心等待。内容越长分析时间越久。
              </Text>
            </Space>
          </Card>
        )}

        {/* 提交按钮 */}
        <Form.Item>
          <Space style={{ width: '100%' }} direction="vertical">
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={loading}
              block
              disabled={loading}
              style={{ height: 50, fontSize: 18 }}
            >
              {loading ? '分析中...' : '开始分析'}
            </Button>
            {loading && (
              <Button
                danger
                block
                onClick={handleCancel}
              >
                取消分析
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default HomePage
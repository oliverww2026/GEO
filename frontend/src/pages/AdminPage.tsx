import { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Input, Select, Switch,
  message, Space, Tag, Typography, Descriptions, Divider
} from 'antd';
import {
  PlusOutlined, EditOutlined, TeamOutlined, BankOutlined,
  KeyOutlined, ReloadOutlined, FileSearchOutlined, EyeOutlined
} from '@ant-design/icons';
import { API_BASE_URL } from '../config/env';
import { useAuth } from '../auth/AuthContext';

const { Text, Title } = Typography;

interface Enterprise {
  id: number;
  name: string;
  invite_code: string;
  brand_name: string;
  brand_position: string;
  service_city: string;
  api_key: string;
  api_base_url: string;
  api_model: string;
  is_active: number;
  created_at: string;
}

interface UserRecord {
  id: number;
  enterprise_id: number;
  username: string;
  display_name: string;
  role: string;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

interface AnalysisLog {
  id: number;
  user_id: number;
  enterprise_id: number;
  username?: string;
  display_name?: string;
  content_length: number;
  channels: string;
  duration_ms: number;
  success: number;
  overall_score: number | null;
  error_message: string;
  created_at: string;
}

interface AnalysisLogDetail extends AnalysisLog {
  input_content: string;
  result_json: string;
}

export default function AdminPage() {
  const { getAuthHeaders } = useAuth();
  const headers = getAuthHeaders();

  // 企业状态
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [enterpriseLoading, setEnterpriseLoading] = useState(false);
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);
  const [editingEnterprise, setEditingEnterprise] = useState<Enterprise | null>(null);
  const [enterpriseForm] = Form.useForm();

  // 用户状态
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [userForm] = Form.useForm();

  // 分析记录状态
  const [logs, setLogs] = useState<AnalysisLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<AnalysisLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const logsPageSize = 15;

  // 加载企业列表
  const fetchEnterprises = useCallback(async () => {
    setEnterpriseLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/enterprises`, { headers });
      const json = await res.json();
      if (json.success) setEnterprises(json.data);
      else message.error(json.message || '获取企业列表失败');
    } catch {
      message.error('网络错误，请检查后端服务');
    } finally {
      setEnterpriseLoading(false);
    }
  }, [headers]);

  useEffect(() => { fetchEnterprises(); }, [fetchEnterprises]);

  // 加载某企业下的用户
  const fetchUsers = useCallback(async (entId: number) => {
    setUsersLoading(true);
    setUsers([]);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/enterprises/${entId}/users`, { headers });
      const json = await res.json();
      if (json.success) setUsers(json.data);
      else message.error(json.message || '获取用户列表失败');
    } catch {
      message.error('网络错误');
    } finally {
      setUsersLoading(false);
    }
  }, [headers]);

  // 加载分析记录列表
  const fetchLogs = useCallback(async (page = 1) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/logs?page=${page}&limit=${logsPageSize}`, { headers });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data.rows);
        setLogsTotal(json.data.total);
        setLogsPage(page);
      } else {
        message.error(json.message || '获取记录失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setLogsLoading(false);
    }
  }, [headers]);

  // 加载单条分析记录详情
  const fetchLogDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/logs/${id}`, { headers });
      const json = await res.json();
      if (json.success) {
        setDetailLog(json.data);
        setDetailModalOpen(true);
      } else {
        message.error(json.message || '获取详情失败');
      }
    } catch {
      message.error('网络错误');
    } finally {
      setDetailLoading(false);
    }
  };

  // 保存企业（新建或编辑）
  const handleEnterpriseOk = async () => {
    try {
      const values = await enterpriseForm.validateFields();
      const url = editingEnterprise
        ? `${API_BASE_URL}/admin/enterprises/${editingEnterprise.id}`
        : `${API_BASE_URL}/admin/enterprises`;
      const method = editingEnterprise ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (json.success) {
        message.success(editingEnterprise ? '企业已更新' : '企业已创建');
        setEnterpriseModalOpen(false);
        enterpriseForm.resetFields();
        fetchEnterprises();
      } else {
        message.error(json.message || '操作失败');
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('操作失败');
    }
  };

  const openEditEnterprise = (record: Enterprise) => {
    setEditingEnterprise(record);
    enterpriseForm.setFieldsValue({
      name: record.name,
      brandName: record.brand_name,
      brandPosition: record.brand_position,
      serviceCity: record.service_city,
      apiKey: record.api_key,
      apiBaseUrl: record.api_base_url,
      apiModel: record.api_model,
    });
    setEnterpriseModalOpen(true);
  };

  const openCreateEnterprise = () => {
    setEditingEnterprise(null);
    enterpriseForm.resetFields();
    enterpriseForm.setFieldsValue({
      apiBaseUrl: 'https://zenmux.ai/api/v1',
      apiModel: 'deepseek/deepseek-v4-pro',
    });
    setEnterpriseModalOpen(true);
  };

  // 保存用户（新建或编辑）
  const handleUserOk = async () => {
    try {
      const values = await userForm.validateFields();
      if (!selectedEnterprise) {
        message.error('请先选择企业');
        return;
      }

      if (editingUser) {
        const body: any = {};
        if (values.displayName !== undefined) body.displayName = values.displayName;
        if (values.role !== undefined) body.role = values.role;
        if (values.isActive !== undefined) body.isActive = values.isActive;
        if (values.password && values.password.trim() !== '') body.password = values.password.trim();

        const res = await fetch(`${API_BASE_URL}/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          message.success('用户已更新');
          setUserModalOpen(false);
          userForm.resetFields();
          fetchUsers(selectedEnterprise.id);
        } else {
          message.error(json.message || '更新失败');
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/admin/enterprises/${selectedEnterprise.id}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            username: values.username,
            password: values.password,
            displayName: values.displayName || values.username,
            role: values.role || 'employee',
          }),
        });
        const json = await res.json();
        if (json.success) {
          message.success('用户已创建');
          setUserModalOpen(false);
          userForm.resetFields();
          fetchUsers(selectedEnterprise.id);
        } else {
          message.error(json.message || '创建失败');
        }
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('操作失败');
    }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    userForm.setFieldsValue({ role: 'employee', isActive: true });
    setUserModalOpen(true);
  };

  const openEditUser = (record: UserRecord) => {
    setEditingUser(record);
    userForm.setFieldsValue({
      displayName: record.display_name,
      role: record.role,
      isActive: !!record.is_active,
    });
    setUserModalOpen(true);
  };

  const handleEnterpriseToggle = async (ent: Enterprise, checked: boolean) => {
    const res = await fetch(`${API_BASE_URL}/admin/enterprises/${ent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ isActive: checked }),
    });
    const json = await res.json();
    if (json.success) {
      message.success(checked ? '企业已启用' : '企业已禁用');
      fetchEnterprises();
    } else {
      message.error(json.message || '操作失败');
    }
  };

  const handleUserToggle = async (user: UserRecord, checked: boolean) => {
    const res = await fetch(`${API_BASE_URL}/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ isActive: checked }),
    });
    const json = await res.json();
    if (json.success) {
      message.success(checked ? '用户已启用' : '用户已禁用');
      if (selectedEnterprise) fetchUsers(selectedEnterprise.id);
    } else {
      message.error(json.message || '操作失败');
    }
  };

  // 格式化时长
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 企业表格列定义
  const enterpriseColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    { title: '企业名称', dataIndex: 'name', key: 'name' },
    {
      title: '邀请码',
      dataIndex: 'invite_code',
      key: 'invite_code',
      width: 100,
      render: (v: string) => v ? <Tag color="green" style={{ fontFamily: 'monospace' }}>{v}</Tag> : '-',
    },
    {
      title: '品牌名称',
      dataIndex: 'brand_name',
      key: 'brand_name',
      render: (v: string) => <Text strong>{v || '-'}</Text>,
    },
    { title: '品牌定位', dataIndex: 'brand_position', key: 'brand_position', ellipsis: true },
    { title: '服务城市', dataIndex: 'service_city', key: 'service_city' },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v: number, record: Enterprise) => (
        <Switch checked={!!v} onChange={(checked) => handleEnterpriseToggle(record, checked)} size="small" />
      ),
    },
    {
      title: '操作', key: 'action', width: 160,
      render: (_: any, record: Enterprise) => (
        <Space>
          <Button type="link" icon={<TeamOutlined />} size="small" onClick={() => {
            setSelectedEnterprise(record);
            fetchUsers(record.id);
          }}>管理用户</Button>
          <Button type="link" icon={<EditOutlined />} size="small" onClick={() => openEditEnterprise(record)}>编辑</Button>
        </Space>
      ),
    },
  ];

  // 用户表格列定义
  const userColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 50 },
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name' },
    {
      title: '角色', dataIndex: 'role', key: 'role', width: 80,
      render: (v: string) => <Tag color={v === 'admin' ? 'red' : 'blue'}>{v === 'admin' ? '管理员' : '员工'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80,
      render: (v: number, record: UserRecord) => (
        <Switch checked={!!v} onChange={(checked) => handleUserToggle(record, checked)} size="small" />
      ),
    },
    { title: '最后登录', dataIndex: 'last_login_at', key: 'last_login_at', render: (v: string | null) => v || '-' },
    {
      title: '操作', key: 'action', width: 80,
      render: (_: any, record: UserRecord) => (
        <Button type="link" icon={<EditOutlined />} size="small" onClick={() => openEditUser(record)}>编辑</Button>
      ),
    },
  ];

  // 分析记录表格列定义
  const logColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: '用户',
      key: 'user',
      width: 100,
      render: (_: any, r: AnalysisLog) => r.display_name || r.username || `用户#${r.user_id}`,
    },
    {
      title: '渠道',
      dataIndex: 'channels',
      key: 'channels',
      width: 120,
      render: (v: string) => v ? v.split(',').map((ch: string) => <Tag key={ch} color="cyan">{ch}</Tag>) : '-',
    },
    { title: '内容长度', dataIndex: 'content_length', key: 'content_length', width: 90, render: (v: number) => `${v}字` },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 70,
      render: (v: number) => v ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>,
    },
    {
      title: '总分',
      dataIndex: 'overall_score',
      key: 'overall_score',
      width: 70,
      render: (v: number | null) => v != null ? <Text strong style={{ color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#f5222d' }}>{v}</Text> : '-',
    },
    { title: '耗时', dataIndex: 'duration_ms', key: 'duration_ms', width: 80, render: (v: number) => formatDuration(v) },
    {
      title: '时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => v ? new Date(v + 'Z').toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', key: 'action', width: 80, fixed: 'right' as const,
      render: (_: any, record: AnalysisLog) => (
        <Button type="link" icon={<EyeOutlined />} size="small" onClick={() => fetchLogDetail(record.id)}>详情</Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}><BankOutlined /> 管理后台</Title>
          <Button icon={<ReloadOutlined />} onClick={fetchEnterprises}>刷新</Button>
        </Space>
      </Card>

      <Tabs
        defaultActiveKey="enterprises"
        onChange={(key) => { if (key === 'logs') fetchLogs(1); }}
        items={[
          {
            key: 'enterprises',
            label: <span><BankOutlined /> 企业管理</span>,
            children: (
              <Card
                title="企业列表"
                extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreateEnterprise}>新建企业</Button>}
              >
                <Table dataSource={enterprises} columns={enterpriseColumns} rowKey="id" loading={enterpriseLoading} pagination={{ pageSize: 10 }} />
              </Card>
            ),
          },
          {
            key: 'users',
            label: <span><TeamOutlined /> 用户管理</span>,
            children: (
              <Card
                title={
                  <Space>
                    <Text>用户列表</Text>
                    {selectedEnterprise && <Tag color="blue">当前企业：{selectedEnterprise.brand_name}（{selectedEnterprise.name}）</Tag>}
                  </Space>
                }
                extra={
                  <Space>
                    {selectedEnterprise && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateUser}>新建用户</Button>
                    )}
                    <Select
                      placeholder="选择企业查看用户"
                      style={{ width: 220 }}
                      onChange={(id) => { const ent = enterprises.find(e => e.id === id); if (ent) { setSelectedEnterprise(ent); fetchUsers(ent.id); } }}
                      options={enterprises.map(e => ({ label: `${e.brand_name}（${e.name}）`, value: e.id }))}
                      allowClear
                    />
                  </Space>
                }
              >
                {!selectedEnterprise ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">请先在企业管理标签中选择一个企业</Text></div>
                ) : (
                  <Table dataSource={users} columns={userColumns} rowKey="id" loading={usersLoading} pagination={{ pageSize: 10 }} />
                )}
              </Card>
            ),
          },
          {
            key: 'logs',
            label: <span><FileSearchOutlined /> 分析记录</span>,
            children: (
              <Card
                title={`分析记录（共 ${logsTotal} 条）`}
                extra={<Button icon={<ReloadOutlined />} onClick={() => fetchLogs(logsPage)}>刷新</Button>}
              >
                <Table
                  dataSource={logs}
                  columns={logColumns}
                  rowKey="id"
                  loading={logsLoading}
                  pagination={{
                    current: logsPage,
                    pageSize: logsPageSize,
                    total: logsTotal,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (page) => fetchLogs(page),
                  }}
                  scroll={{ x: 1000 }}
                />
              </Card>
            ),
          },
        ]}
      />

      {/* ===== 企业弹窗 ===== */}
      <Modal
        title={editingEnterprise ? '编辑企业' : '新建企业'}
        open={enterpriseModalOpen}
        onOk={handleEnterpriseOk}
        onCancel={() => { setEnterpriseModalOpen(false); enterpriseForm.resetFields(); }}
        width={640}
        destroyOnClose
      >
        <Form form={enterpriseForm} layout="vertical">
          <Form.Item name="name" label="企业名称（内部标识）" rules={[{ required: true, message: '请输入企业名称' }]}>
            <Input placeholder="如：久久金集团" />
          </Form.Item>
          <Form.Item name="brandName" label="品牌名称" rules={[{ required: true, message: '请输入品牌名称' }]}>
            <Input placeholder="如：久久金" />
          </Form.Item>
          <Form.Item name="brandPosition" label="品牌定位">
            <Input placeholder="如：专业黄金回收管家" />
          </Form.Item>
          <Form.Item name="serviceCity" label="服务城市">
            <Input placeholder="如：深圳" />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key（企业独立 AI Token）">
            <Input.Password placeholder="输入企业自己的 API Key" iconRender={(visible) => visible ? <KeyOutlined /> : <KeyOutlined />} />
            <Text type="secondary" style={{ fontSize: 12 }}>企业提供自己购买的 API Key，AI 分析消耗将计入该 Key 的额度</Text>
          </Form.Item>
          <Form.Item name="apiBaseUrl" label="API Base URL">
            <Input placeholder="https://zenmux.ai/api/v1" />
          </Form.Item>
          <Form.Item name="apiModel" label="API Model">
            <Input placeholder="deepseek/deepseek-v4-pro" />
          </Form.Item>
        </Form>
      </Modal>

      {/* ===== 用户弹窗 ===== */}
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={userModalOpen}
        onOk={handleUserOk}
        onCancel={() => { setUserModalOpen(false); userForm.resetFields(); }}
        width={520}
        destroyOnClose
      >
        <Form form={userForm} layout="vertical">
          {!editingUser && (
            <>
              <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
                <Input placeholder="登录用户名" autoComplete="off" />
              </Form.Item>
              <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
                <Input.Password placeholder="登录密码" autoComplete="new-password" />
              </Form.Item>
            </>
          )}
          <Form.Item name="displayName" label="显示名称">
            <Input placeholder="如：张三" />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select options={[
              { label: '管理员（可管理企业/用户）', value: 'admin' },
              { label: '员工（仅可使用分析功能）', value: 'employee' },
            ]} />
          </Form.Item>
          {editingUser && (
            <>
              <Form.Item name="password" label="新密码（留空则不修改）">
                <Input.Password placeholder="留空则不修改密码" autoComplete="new-password" />
              </Form.Item>
              <Form.Item name="isActive" label="启用状态" valuePropName="checked">
                <Switch />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* ===== 分析记录详情弹窗 ===== */}
      <Modal
        title={`分析记录详情 #${detailLog?.id || ''}`}
        open={detailModalOpen}
        onCancel={() => { setDetailModalOpen(false); setDetailLog(null); }}
        width={900}
        footer={null}
        destroyOnClose
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
        ) : detailLog ? (
          <div>
            <Descriptions column={3} size="small" bordered>
              <Descriptions.Item label="用户">{detailLog.display_name || detailLog.username || `用户#${detailLog.user_id}`}</Descriptions.Item>
              <Descriptions.Item label="渠道">{detailLog.channels || '-'}</Descriptions.Item>
              <Descriptions.Item label="状态">
                {detailLog.success ? <Tag color="green">成功</Tag> : <Tag color="red">失败</Tag>}
              </Descriptions.Item>
              <Descriptions.Item label="内容长度">{detailLog.content_length} 字</Descriptions.Item>
              <Descriptions.Item label="总分">
                {detailLog.overall_score != null ? <Text strong style={{ fontSize: 16, color: detailLog.overall_score >= 80 ? '#52c41a' : detailLog.overall_score >= 60 ? '#faad14' : '#f5222d' }}>{detailLog.overall_score}</Text> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="耗时">{formatDuration(detailLog.duration_ms)}</Descriptions.Item>
              <Descriptions.Item label="创建时间" span={3}>
                {detailLog.created_at ? new Date(detailLog.created_at + 'Z').toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>

            {detailLog.error_message && (
              <>
                <Divider />
                <Title level={5} type="danger">错误信息</Title>
                <pre style={{ background: '#fff2f0', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>
                  {detailLog.error_message}
                </pre>
              </>
            )}

            <Divider />
            <Title level={5}>输入内容</Title>
            <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto', fontSize: 13 }}>
              {detailLog.input_content || '（无）'}
            </pre>

            <Divider />
            <Title level={5}>分析结果</Title>
            <pre style={{ background: '#f0f5ff', padding: 12, borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 500, overflow: 'auto', fontSize: 12 }}>
              {detailLog.result_json ? (() => {
                try { return JSON.stringify(JSON.parse(detailLog.result_json), null, 2); }
                catch { return detailLog.result_json; }
              })() : '（无）'}
            </pre>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}><Text type="secondary">加载详情失败</Text></div>
        )}
      </Modal>
    </div>
  );
}
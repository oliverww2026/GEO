import { useState, useEffect, useCallback } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Input, Select, Switch,
  message, Space, Tag, Typography
} from 'antd';
import {
  PlusOutlined, EditOutlined, TeamOutlined, BankOutlined,
  KeyOutlined, ReloadOutlined
} from '@ant-design/icons';
import { API_BASE_URL } from '../config/env';
import { useAuth } from '../auth/AuthContext';

const { Text, Title } = Typography;

interface Enterprise {
  id: number;
  name: string;
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
      if (err?.errorFields) return; // 表单验证错误
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
        // 编辑现有用户
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
        // 创建新用户
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

  // 企业表格列定义
  const enterpriseColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '企业名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '品牌名称',
      dataIndex: 'brand_name',
      key: 'brand_name',
      render: (v: string) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: '品牌定位',
      dataIndex: 'brand_position',
      key: 'brand_position',
      ellipsis: true,
    },
    {
      title: '服务城市',
      dataIndex: 'service_city',
      key: 'service_city',
    },
    {
      title: 'API Key',
      dataIndex: 'api_key',
      key: 'api_key',
      width: 200,
      render: (v: string) => v ? (
        <Space>
          <KeyOutlined style={{ color: '#52c41a' }} />
          <Text copyable={{ text: v }} ellipsis style={{ maxWidth: 120 }}>
            {v.slice(0, 20)}...
          </Text>
        </Space>
      ) : <Tag>未配置</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v: number, record: Enterprise) => (
        <Switch
          checked={!!v}
          onChange={(checked) => handleEnterpriseToggle(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Enterprise) => (
        <Space>
          <Button
            type="link"
            icon={<TeamOutlined />}
            size="small"
            onClick={() => {
              setSelectedEnterprise(record);
              fetchUsers(record.id);
            }}
          >
            管理用户
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => openEditEnterprise(record)}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  // 用户表格列定义
  const userColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 50,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '显示名',
      dataIndex: 'display_name',
      key: 'display_name',
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 80,
      render: (v: string) => (
        <Tag color={v === 'admin' ? 'red' : 'blue'}>
          {v === 'admin' ? '管理员' : '员工'}
        </Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      render: (v: number, record: UserRecord) => (
        <Switch
          checked={!!v}
          onChange={(checked) => handleUserToggle(record, checked)}
          size="small"
        />
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (v: string | null) => v || '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: UserRecord) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          size="small"
          onClick={() => openEditUser(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <Card style={{ marginBottom: 24 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>
            <BankOutlined /> 管理后台
          </Title>
          <Button icon={<ReloadOutlined />} onClick={fetchEnterprises}>刷新</Button>
        </Space>
      </Card>

      <Tabs
        defaultActiveKey="enterprises"
        items={[
          {
            key: 'enterprises',
            label: (
              <span>
                <BankOutlined /> 企业管理
              </span>
            ),
            children: (
              <Card
                title="企业列表"
                extra={
                  <Button type="primary" icon={<PlusOutlined />} onClick={openCreateEnterprise}>
                    新建企业
                  </Button>
                }
              >
                <Table
                  dataSource={enterprises}
                  columns={enterpriseColumns}
                  rowKey="id"
                  loading={enterpriseLoading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          {
            key: 'users',
            label: (
              <span>
                <TeamOutlined /> 用户管理
              </span>
            ),
            children: (
              <Card
                title={
                  <Space>
                    <Text>用户列表</Text>
                    {selectedEnterprise && (
                      <Tag color="blue">
                        当前企业：{selectedEnterprise.brand_name}（{selectedEnterprise.name}）
                      </Tag>
                    )}
                  </Space>
                }
                extra={
                  <Space>
                    {selectedEnterprise && (
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreateUser}>
                        新建用户
                      </Button>
                    )}
                    <Select
                      placeholder="选择企业查看用户"
                      style={{ width: 220 }}
                      onChange={(id) => {
                        const ent = enterprises.find(e => e.id === id);
                        if (ent) {
                          setSelectedEnterprise(ent);
                          fetchUsers(ent.id);
                        }
                      }}
                      options={enterprises.map(e => ({
                        label: `${e.brand_name}（${e.name}）`,
                        value: e.id,
                      }))}
                      allowClear
                    />
                  </Space>
                }
              >
                {!selectedEnterprise ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <Text type="secondary">请先在企业管理标签中选择一个企业，或在上方下拉框中选择</Text>
                  </div>
                ) : (
                  <Table
                    dataSource={users}
                    columns={userColumns}
                    rowKey="id"
                    loading={usersLoading}
                    pagination={{ pageSize: 10 }}
                  />
                )}
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
            <Input.Password
              placeholder="输入企业自己的 API Key，留空则使用系统默认 Key"
              iconRender={(visible) => visible ? <KeyOutlined /> : <KeyOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              企业提供自己购买的 API Key，AI 分析消耗将计入该 Key 的额度
            </Text>
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
            <Select
              options={[
                { label: '管理员（可管理企业/用户）', value: 'admin' },
                { label: '员工（仅可使用分析功能）', value: 'employee' },
              ]}
            />
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
    </div>
  );
}
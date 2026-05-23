import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Spin, Result, Button } from 'antd';

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // 需要管理员权限但当前用户不是管理员
  if (requireAdmin && user?.role !== 'admin') {
    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面，仅管理员可管理企业/用户。"
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回上页
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Divider, message } from 'antd';
import { LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const Login: React.FC = () => {
  const [form] = Form.useForm();
  const [isRegister, setIsRegister] = useState(false);
  const { login, register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  const handleSubmit = async (values: any) => {
    try {
      let success: boolean;
      
      if (isRegister) {
        success = await register({
          username: values.username,
          email: values.email,
          password: values.password
        });
      } else {
        success = await login({
          email: values.email,
          password: values.password
        });
      }

      if (success) {
        message.success(isRegister ? '注册成功' : '登录成功');
        navigate('/');
      }
    } catch (err) {
      message.error('操作失败，请重试');
    }
  };

  return (
    <div className="login-page min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-950 to-gray-900">
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          borderRadius: 16,
          padding: '2rem',
          margin: 'auto',
          backgroundColor: '#ffffff'
        }}
      >
        <div className="text-center mb-8">
          <Title level={3} style={{ marginBottom: 16, color: '#000000', fontSize: '1.75rem', fontWeight: 600 }}>
            {isRegister ? '注册账号' : '用户登录'}
          </Title>
          <Paragraph style={{ color: '#000000', fontSize: '16px', lineHeight: 1.5 }}>
            {isRegister ? '创建新账号开始管理您的投资' : '登录后同步您的投资数据'}
          </Paragraph>
        </div>

        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
          style={{ maxWidth: '100%' }}
        >
          {isRegister && (
            <Form.Item
              name="username"
              label="用户名"
              labelCol={{ style: { color: '#000000', fontSize: '16px', fontWeight: 500 } }}
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' }
              ]}
              style={{ marginBottom: '1.25rem' }}
            >
              <Input
                prefix={<UserOutlined className="text-blue-500" />}
                placeholder="请输入用户名"
                size="large"
                style={{ 
                  borderRadius: 8, 
                  height: 52,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '16px',
                  padding: '0 16px'
                }}
              />
            </Form.Item>
          )}

          <Form.Item
            name="email"
            label="邮箱"
            labelCol={{ style: { color: '#000000', fontSize: '16px', fontWeight: 500 } }}
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
            style={{ marginBottom: '1.25rem' }}
          >
            <Input
                prefix={<MailOutlined className="text-blue-500" />}
                placeholder="请输入邮箱"
                size="large"
                style={{ 
                  borderRadius: 8, 
                  height: 52,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '16px',
                  padding: '0 16px'
                }}
              />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            labelCol={{ style: { color: '#000000', fontSize: '16px', fontWeight: 500 } }}
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
            style={{ marginBottom: '1.75rem' }}
          >
            <Input.Password
                prefix={<LockOutlined className="text-blue-500" />}
                placeholder="请输入密码"
                size="large"
                style={{ 
                  borderRadius: 8, 
                  height: 52,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '16px',
                  padding: '0 16px'
                }}
              />
            </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              size="large"
              block
              style={{
                height: 52,
                borderRadius: 8,
                fontSize: '18px',
                fontWeight: 600,
                backgroundColor: '#1890ff',
                borderColor: '#1890ff',
                color: '#ffffff'
              }}
            >
              {isRegister ? '注册' : '登录'}
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '28px 0', borderColor: '#e5e7eb' }} />

        <div className="text-center">
          <span style={{ color: '#4b5563', fontSize: '16px' }}>
            {isRegister ? '已有账号？' : '还没有账号？'}
            <a
              onClick={() => setIsRegister(!isRegister)}
              style={{ 
                marginLeft: 8, 
                cursor: 'pointer', 
                color: '#3b82f6',
                fontSize: '16px',
                fontWeight: 600
              }}
            >
              {isRegister ? '去登录' : '立即注册'}
            </a>
          </span>
        </div>
      </Card>
    </div>
  );
};

export default Login;

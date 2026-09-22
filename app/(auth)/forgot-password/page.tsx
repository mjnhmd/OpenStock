'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InputField from '@/components/forms/InputField';
import FooterLink from '@/components/forms/FooterLink';
import OpenDevSocietyBranding from '@/components/OpenDevSocietyBranding';
import { requestPasswordResetEmail } from '@/lib/actions/auth.actions';

type ForgotPasswordFormData = {
    email: string;
};

const ForgotPasswordPage = () => {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormData>({
        defaultValues: {
            email: '',
        },
        mode: 'onBlur',
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        try {
            const result = await requestPasswordResetEmail(data);

            if (result.success) {
                toast.success('如果该邮箱已注册，重置链接已发送。');
                return;
            }

            toast.error('暂时无法重置密码', {
                description: result.error ?? '无法发起密码重置。',
            });
        } catch (error) {
            toast.error('暂时无法重置密码', {
                description: error instanceof Error ? error.message : '无法发起密码重置。',
            });
        }
    };

    return (
        <>
            <h1 className="form-title">忘记密码？</h1>
            <p className="text-sm text-gray-400 mb-6">
                输入注册邮箱，我们会发送密码重置链接。
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="email"
                    label="邮箱"
                    placeholder="opendevsociety@cc.cc"
                    register={register}
                    error={errors.email}
                    validation={{
                        required: '请输入邮箱',
                        pattern: {
                            value: /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/,
                            message: '请输入有效邮箱地址',
                        },
                    }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? '发送中...' : '发送重置链接'}
                </Button>

                <FooterLink text="想起密码了？" linkText="返回登录" href="/sign-in" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    );
};

export default ForgotPasswordPage;

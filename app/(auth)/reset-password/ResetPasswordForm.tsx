'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import FooterLink from '@/components/forms/FooterLink';
import InputField from '@/components/forms/InputField';
import PasswordRequirements from '@/components/forms/PasswordRequirements';
import OpenDevSocietyBranding from '@/components/OpenDevSocietyBranding';
import { Button } from '@/components/ui/button';
import { resetPasswordWithToken } from '@/lib/actions/auth.actions';
import { PASSWORD_VALIDATION } from '@/lib/constants';

type ResetPasswordFormData = {
    newPassword: string;
    confirmPassword: string;
};

const ResetPasswordForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token') ?? '';
    const error = searchParams.get('error');

    const {
        register,
        watch,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormData>({
        defaultValues: {
            newPassword: '',
            confirmPassword: '',
        },
        mode: 'onBlur',
    });

    const newPassword = watch('newPassword');

    useEffect(() => {
        if (error === 'INVALID_TOKEN') {
            toast.error('重置链接无效或已过期。');
        }
    }, [error]);

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            toast.error('重置链接无效或已过期。');
            return;
        }

        try {
            const result = await resetPasswordWithToken({
                token,
                newPassword: data.newPassword,
            });

            if (result.success) {
                toast.success('密码已更新，请重新登录。');
                router.push('/sign-in');
                return;
            }

            toast.error('密码重置失败', {
                description: result.error ?? '无法重置密码。',
            });
        } catch (error) {
            toast.error('密码重置失败', {
                description: error instanceof Error ? error.message : '无法重置密码。',
            });
        }
    };

    return (
        <>
            <h1 className="form-title">设置新密码</h1>
            <p className="text-sm text-gray-400 mb-6">
                请输入账号的新密码。
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="newPassword"
                    label="新密码"
                    placeholder="请输入新密码"
                    type="password"
                    register={register}
                    error={errors.newPassword}
                    validation={PASSWORD_VALIDATION}
                />
                <PasswordRequirements password={newPassword ?? ''} />

                <InputField
                    name="confirmPassword"
                    label="确认密码"
                    placeholder="请再次输入新密码"
                    type="password"
                    register={register}
                    error={errors.confirmPassword}
                    validation={{
                        required: '请确认新密码',
                        validate: (value: string) =>
                            value === newPassword || '两次输入的密码不一致',
                    }}
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? '重置中...' : '重置密码'}
                </Button>

                <FooterLink text="需要新的链接？" linkText="重新发送" href="/forgot-password" />
                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
            </form>
        </>
    );
};

export default ResetPasswordForm;

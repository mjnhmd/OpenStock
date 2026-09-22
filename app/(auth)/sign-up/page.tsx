'use client';

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import PasswordRequirements from "@/components/forms/PasswordRequirements";
import { INVESTMENT_GOALS, PASSWORD_VALIDATION, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import { signUpWithEmail } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OpenDevSocietyBranding from "@/components/OpenDevSocietyBranding";
import React from "react";

const SignUp = () => {
    const router = useRouter()
    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormData>({
        defaultValues: {
            fullName: '',
            email: '',
            password: '',
            country: 'CN',
            investmentGoals: 'Growth',
            riskTolerance: 'Medium',
            preferredIndustry: 'Technology'
        },
        mode: 'onBlur'
    },);

    const passwordValue = watch('password');

    const onSubmit = async (data: SignUpFormData) => {
        try {
            const result = await signUpWithEmail(data);
            if (result.success) {
                router.push('/');
                return;
            }
            toast.error('注册失败', {
                description: result.error ?? '无法创建账号，请稍后重试。',
            });
        } catch (e) {
            console.error(e);
            toast.error('注册失败', {
                description: e instanceof Error ? e.message : '创建账号失败，请稍后重试。'
            })
        }
    }

    return (
        <>
            <h1 className="form-title">注册并设置偏好</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <InputField
                    name="fullName"
                    label="姓名"
                    placeholder="请输入姓名"
                    register={register}
                    error={errors.fullName}
                    validation={{ required: '请输入姓名', minLength: 2 }}
                />

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
                            message: '请输入有效邮箱地址'
                        }
                    }}
                />

                <InputField
                    name="password"
                    label="密码"
                    placeholder="请输入高强度密码"
                    type="password"
                    register={register}
                    error={errors.password}
                    validation={PASSWORD_VALIDATION}
                />
                <PasswordRequirements password={passwordValue ?? ''} />

                <CountrySelectField
                    name="country"
                    label="国家/地区"
                    control={control}
                    error={errors.country}
                    required
                />

                <SelectField
                    name="investmentGoals"
                    label="投资目标"
                    placeholder="请选择投资目标"
                    options={INVESTMENT_GOALS}
                    control={control}
                    error={errors.investmentGoals}
                    required
                />

                <SelectField
                    name="riskTolerance"
                    label="风险偏好"
                    placeholder="请选择风险偏好"
                    options={RISK_TOLERANCE_OPTIONS}
                    control={control}
                    error={errors.riskTolerance}
                    required
                />

                <SelectField
                    name="preferredIndustry"
                    label="偏好行业"
                    placeholder="请选择偏好行业"
                    options={PREFERRED_INDUSTRIES}
                    control={control}
                    error={errors.preferredIndustry}
                    required
                />

                <Button type="submit" disabled={isSubmitting} className="yellow-btn w-full mt-5">
                    {isSubmitting ? '正在创建账号...' : '开始使用'}
                </Button>

                <FooterLink text="已有账号？" linkText="立即登录" href="/sign-in" />

                <OpenDevSocietyBranding outerClassName="mt-10 flex justify-center" />
                <div className="mt-5 flex justify-center">
                    <a href="https://peerlist.io/ravixalgorithm/project/openstock" target="_blank" rel="noreferrer">
                        <img
                            src="https://peerlist.io/api/v1/projects/embed/PRJH8OED7MBL9MGB9HRMKAKLM66KNN?showUpvote=true&theme=light"
                            alt="OpenStock"
                            style={{ width: 'auto', height: '72px' }}
                        />
                    </a>
                </div>
            </form>
        </>
    )
}
export default SignUp;

import { Suspense } from 'react';

import ResetPasswordForm from './ResetPasswordForm';

const ResetPasswordPage = () => {
    return (
        <Suspense fallback={<div className="text-sm text-gray-400">正在加载重置表单...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
};

export default ResetPasswordPage;

export const openRazorpay = async (options: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (typeof (window as any).Razorpay === 'undefined') {
            reject({ description: 'Razorpay SDK not loaded' });
            return;
        }

        const optionsWithHandlers = {
            ...options,
            handler: (response: any) => resolve(response),
            modal: {
                ondismiss: () => reject({ description: 'Payment cancelled' })
            }
        };

        const rzp1 = new (window as any).Razorpay(optionsWithHandlers);
        rzp1.on('payment.failed', (response: any) => {
            reject(response.error || { description: 'Payment failed' });
        });
        rzp1.open();
    });
};

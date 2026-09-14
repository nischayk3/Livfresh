// Loads Razorpay checkout.js and returns the Razorpay constructor.
// On web the Standard Checkout SDK is loaded from the global script tag,
// which is injected on demand if not already present.
const loadRazorpayCheckout = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Razorpay requires a browser environment'));
            return;
        }
        if ((window as any).Razorpay) {
            resolve((window as any).Razorpay);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            if ((window as any).Razorpay) {
                resolve((window as any).Razorpay);
            } else {
                reject(new Error('Razorpay SDK failed to initialize'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
        document.body.appendChild(script);
    });
};

export const openRazorpay = async (options: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject({ description: 'Razorpay requires a browser environment' });
            return;
        }

        loadRazorpayCheckout()
            .then((Razorpay: any) => {
                const optionsWithHandlers = {
                    ...options,
                    handler: (response: any) => resolve(response),
                    modal: {
                        ondismiss: () => reject({ description: 'Payment cancelled' })
                    }
                };

                const rzp1 = new Razorpay(optionsWithHandlers);
                rzp1.on('payment.failed', (response: any) => {
                    reject(response.error || { description: 'Payment failed' });
                });
                rzp1.open();
            })
            .catch((error: any) => {
                reject({ description: error.message || 'Razorpay SDK not loaded' });
            });
    });
};

/**
 * Generate a 4-digit OTP (1000-9999)
 * Used for order pickup and delivery verification
 */
export const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Format OTP for display (adds spacing)
 */
export const formatOTP = (otp: string): string => {
  return otp.split('').join(' ');
};



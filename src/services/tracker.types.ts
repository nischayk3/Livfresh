export type StandardEventName =
  | 'onboarding_viewed'
  | 'onboarding_completed'
  | 'login_screen_viewed'
  | 'otp_requested'
  | 'user_login'
  | 'complete_registration'
  | 'home_viewed'
  | 'view_item'
  | 'add_to_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'screen_view';

export interface BaseEventParams {
  currency?: string;
  [key: string]: any;
}

export interface ItemParam {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number;
  quantity?: number;
}

export interface ViewItemParams extends BaseEventParams {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
}

export interface AddToCartParams extends BaseEventParams {
  item_id: string;
  item_name: string;
  item_category?: string;
  price: number;
  quantity: number;
  total_value?: number;
}

export interface BeginCheckoutParams extends BaseEventParams {
  value: number;
  num_items: number;
  items?: ItemParam[];
}

export interface PurchaseParams extends BaseEventParams {
  transaction_id: string;
  value: number;
  payment_mode?: string;
  items?: ItemParam[];
}

export interface ScreenViewParams {
  screen_name: string;
  screen_class?: string;
}

export interface OnboardingParams {
  step_index?: number;
  total_steps?: number;
}

export interface AuthParams {
  method?: string;
  phone?: string;
  user_id?: string;
}

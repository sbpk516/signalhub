// Utility Types for common patterns

// Make all properties optional
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties required
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Pick specific properties
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit specific properties
export type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;

// Make specific properties optional
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Union of all possible values
export type ValueOf<T> = T[keyof T];

// Extract the type of an array element
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

// Extract the type of a promise
export type PromiseType<T> = T extends Promise<infer U> ? U : never;

// Extract the type of a function's return value
export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Extract the type of a function's parameters
export type Parameters<T> = T extends (...args: infer P) => any ? P : never;

// Deep partial - makes all nested properties optional
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Deep required - makes all nested properties required
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// Record with specific key and value types
export type Record<K extends keyof any, T> = {
  [P in K]: T;
};

// Non-nullable type
export type NonNullable<T> = T extends null | undefined ? never : T;

// Function type with specific parameters and return type
export type Function<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => TReturn;

// Async function type
export type AsyncFunction<TArgs extends any[] = any[], TReturn = any> = (...args: TArgs) => Promise<TReturn>;

// Event handler type
export type EventHandler<TEvent = Event> = (event: TEvent) => void;

// Form event handler
export type FormEventHandler = EventHandler<React.FormEvent<HTMLFormElement>>;

// Input change handler
export type InputChangeHandler = EventHandler<React.ChangeEvent<HTMLInputElement>>;

// Button click handler
export type ButtonClickHandler = EventHandler<React.MouseEvent<HTMLButtonElement>>;

// Component props with children
export type PropsWithChildren<P = {}> = P & {
  children?: React.ReactNode;
};

// Component props with optional children
export type PropsWithOptionalChildren<P = {}> = P & {
  children?: React.ReactNode;
};

// Component props without children
export type PropsWithoutChildren<P = {}> = Omit<P, 'children'>;

// Styled component props
export type StyledProps<P = {}> = P & {
  className?: string;
  style?: React.CSSProperties;
};

// Form field props
export type FormFieldProps = {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
};

// Modal props
export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
};

// Toast notification props
export type ToastProps = {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: (id: string) => void;
};

// Pagination props
export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
};

// Sort props
export type SortProps<T = any> = {
  field: keyof T;
  direction: 'asc' | 'desc';
};

// Filter props
export type FilterProps<T = any> = {
  field: keyof T;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
};

// Query params
export type QueryParams = {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: string;
  search?: string;
};

// API request config
export type ApiRequestConfig = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  withCredentials?: boolean;
};

// API response wrapper
export type ApiResponseWrapper<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: ApiRequestConfig;
};

// Loading state
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Async state
export type AsyncState<T = any> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
};

// Form state
export type FormState<T = any> = {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
};

// Validation result
export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

// File validation result
export type FileValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

// Theme type
export type Theme = 'light' | 'dark' | 'system';

// Language type
export type Language = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

// Currency type
export type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';

// Timezone type
export type Timezone = string; // e.g., 'America/New_York', 'Europe/London'

// Date format type
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY';

// Time format type
export type TimeFormat = '12h' | '24h';

// Size type
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

// Variant type
export type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Position type
export type Position = 'top' | 'right' | 'bottom' | 'left' | 'center';

// Alignment type
export type Alignment = 'left' | 'center' | 'right' | 'justify';

// Flex direction type
export type FlexDirection = 'row' | 'row-reverse' | 'col' | 'col-reverse';

// Justify content type
export type JustifyContent = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';

// Align items type
export type AlignItems = 'start' | 'end' | 'center' | 'baseline' | 'stretch';

// Border radius type
export type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

// Shadow type
export type Shadow = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Opacity type
export type Opacity = 0 | 5 | 10 | 20 | 25 | 30 | 40 | 50 | 60 | 70 | 75 | 80 | 90 | 95 | 100;

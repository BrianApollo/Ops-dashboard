export interface Advertorial {
    id: string;
    name: string;
    productId: string;
    productName: string;
    text?: string;
    link?: string;
    isChecked: boolean;
    createdAt: string;
}

export interface AdvertorialFilters {
    productId: string | null;
}

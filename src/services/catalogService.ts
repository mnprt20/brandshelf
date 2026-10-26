import { IRepository } from "../repository/types";
import { Product, Category, SessionContext } from "../types";

export class CatalogService {
  constructor(private repo: IRepository) {}

  async listCategories(session: SessionContext): Promise<Category[]> {
    return this.repo.getCategories(session.storeId);
  }

  async saveCategory(session: SessionContext, name: string, categoryId?: string): Promise<Category> {
    if (session.role !== "owner") throw new Error("Staff cannot manage categories");
    const existing = categoryId ? (await this.repo.getCategories(session.storeId)).find(c => c.id === categoryId) : null;
    const cat: Category = {
      id: existing ? existing.id : "cat_" + Math.random().toString(36).substring(2, 9),
      storeId: session.storeId,
      name: name.trim(),
      sortOrder: existing ? existing.sortOrder : 0
    };
    await this.repo.saveCategory(cat);
    return cat;
  }

  async deleteCategory(session: SessionContext, categoryId: string): Promise<void> {
    if (session.role !== "owner") throw new Error("Staff cannot manage categories");
    await this.repo.deleteCategory(session.storeId, categoryId);
  }

  async listProducts(session: SessionContext): Promise<Product[]> {
    return this.repo.getProducts(session.storeId);
  }

  async getProduct(session: SessionContext, productId: string): Promise<Product | null> {
    return this.repo.getProductById(session.storeId, productId);
  }

  async saveProduct(session: SessionContext, productData: {
    id?: string;
    categoryId: string;
    name: string;
    description: string;
    pricePaise: number;
    stock: number | null;
    isAvailable: boolean;
    image?: string;
    images?: string[];
    isFeatured?: boolean;
    isBestSeller?: boolean;
  }): Promise<Product> {
    if (session.role !== "owner") throw new Error("Staff cannot manage products");
    if (productData.pricePaise < 0) throw new Error("Price cannot be negative");

    let p: Product;
    if (productData.id) {
      const existing = await this.repo.getProductById(session.storeId, productData.id);
      if (!existing) throw new Error("Product not found");
      p = {
        ...existing,
        categoryId: productData.categoryId,
        name: productData.name.trim(),
        description: productData.description.trim(),
        pricePaise: Math.round(productData.pricePaise),
        stock: productData.stock !== null ? Math.max(0, Math.floor(productData.stock)) : null,
        isAvailable: productData.isAvailable,
        image: productData.image !== undefined ? productData.image : existing.image,
        images: productData.images !== undefined ? productData.images : existing.images,
        isFeatured: productData.isFeatured !== undefined ? productData.isFeatured : existing.isFeatured,
        isBestSeller: productData.isBestSeller !== undefined ? productData.isBestSeller : existing.isBestSeller
      };
    } else {
      p = {
        id: "prod_" + Math.random().toString(36).substring(2, 9),
        storeId: session.storeId,
        categoryId: productData.categoryId,
        name: productData.name.trim(),
        description: productData.description.trim(),
        pricePaise: Math.round(productData.pricePaise),
        stock: productData.stock !== null ? Math.max(0, Math.floor(productData.stock)) : null,
        isAvailable: productData.isAvailable,
        image: productData.image,
        images: productData.images,
        isFeatured: productData.isFeatured || false,
        isBestSeller: productData.isBestSeller || false,
        soldCount: 0,
        createdByUserId: session.userId,
        createdAt: Date.now()
      };
    }
    await this.repo.saveProduct(p);
    return p;
  }

  async deleteProduct(session: SessionContext, productId: string): Promise<void> {
    if (session.role !== "owner") throw new Error("Staff cannot manage products");
    await this.repo.deleteProduct(session.storeId, productId);
  }
}

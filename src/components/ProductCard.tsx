import { ArrowRight, Plus } from "lucide-react";
import { formatPrice } from "../api/store";
import type { Product } from "../api/store";
import { navigateTo } from "../navigation";
import ProductImage from "./ProductImage";

type Props = {
  product: Product;
  bagQuantity: number;
  onAdd: (product: Product) => void;
};

export default function ProductCard({ product, bagQuantity, onAdd }: Props) {
  const productPath = `/products/${encodeURIComponent(product.productSlug)}`;
  return (
    <article className="product">
      <a
        href={productPath}
        className="product-image"
        onClick={(event) => navigateTo(event, productPath)}
        aria-label={`View ${product.productName}`}
      >
        <ProductImage src={product.imageUrl} alt={product.productName} />
        {product.stockQuantity === 0 && (
          <span className="product-tag">Out of stock</span>
        )}
        <span className="product-view">
          Discover <ArrowRight size={17} />
        </span>
      </a>
      <div className="product-info">
        <div>
          <a
            className="product-name"
            href={productPath}
            onClick={(event) => navigateTo(event, productPath)}
          >
            {product.productName}
          </a>
          <p className="product-price">{formatPrice(product)}</p>
        </div>
        <button
          className="icon-button add-product"
          disabled={
            product.stockQuantity === 0 || bagQuantity >= product.stockQuantity
          }
          onClick={() => onAdd(product)}
          aria-label={`Add ${product.productName} to bag`}
        >
          <Plus size={18} />
        </button>
      </div>
    </article>
  );
}

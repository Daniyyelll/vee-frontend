import { ArrowRight, Plus } from "lucide-react";
import { formatPrice } from "../api/store";
import type { Product } from "../api/store";
import ProductImage from "./ProductImage";

type Props = {
  product: Product;
  bagQuantity: number;
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
};

export default function ProductCard({
  product,
  bagQuantity,
  onOpen,
  onAdd,
}: Props) {
  return (
    <article className="product">
      <button
        className="product-image"
        onClick={() => onOpen(product)}
        aria-label={`View ${product.productName}`}
      >
        <ProductImage src={product.imageUrl} alt={product.productName} />
        {product.stockQuantity === 0 && (
          <span className="product-tag">Out of stock</span>
        )}
        <span className="product-view">
          Discover <ArrowRight size={17} />
        </span>
      </button>
      <div className="product-info">
        <div>
          <button className="product-name" onClick={() => onOpen(product)}>
            {product.productName}
          </button>
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

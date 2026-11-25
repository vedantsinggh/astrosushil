import { Menu, X, User, ShoppingCart } from "lucide-react";
import { useCartStore } from "../../store/useCartStore";
import { Link } from "react-router-dom";
import { useCurrency } from "../../hooks/useCurrency";
export const CartDropdown = ({ onClose }) => {
  const { convert } = useCurrency();

  const formatPrice = (amount) => {
    return convert(Number(amount || 0));
  };
  const { cart, removeFromCart, loading } = useCartStore();
  const items = cart?.items ?? [];
  const tax = cart?.tax ?? 0;
  const subtotal =
    cart?.subTotal ?? items.reduce((s, i) => s + (i.total || 0), 0);
  const shipping = cart?.shipping ?? (subtotal > 499 ? 0 : 49);
  const total = cart?.totalAmount ?? subtotal + shipping;

  return (
    <div
      className="absolute right-0 top-full mt-3 w-80 rounded-2xl flex flex-col max-h-180 overflow-hidden border border-black/8 z-50 bg-white animate-dropdown"
      style={{
        boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-black/8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={15} className="text-primary" />
          <h2 className="font-heading font-bold text-primary text-sm">
            My Cart
          </h2>
        </div>
        {items.length > 0 && (
          <span className="text-[11px] font-body font-semibold text-primary bg-secondary/50 border border-primary/15 px-2.5 py-0.5 rounded-full">
            {items.reduce((s, i) => s + i.quantity, 0)} items
          </span>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 bg-secondary/10 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-secondary/40 border border-primary/10 flex items-center justify-center">
              <ShoppingCart size={24} className="text-primary/30" />
            </div>
            <p className="text-sm font-body text-black/40">
              Your cart is empty
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.product}-${item.variantId}`}
              className="flex gap-3 items-center p-2.5 rounded-xl bg-white border border-black/8 hover:border-primary/20 hover:shadow-sm transition-all duration-150"
            >
              {/* Thumbnail */}
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-secondary/20 border border-black/8 shrink-0">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "/Image/placeholder.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart size={14} className="text-primary/20" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-heading font-semibold text-primary line-clamp-1">
                  {item.name}
                </p>
                <p className="text-[11px] font-body text-black/40 mt-0.5">
                  Qty: {item.quantity}
                </p>
                <p className="text-xs font-body font-bold text-primary mt-0.5">
                  {formatPrice(item.total ?? item.price * item.quantity)}
                </p>
              </div>

              {/* Remove */}
              <button
                onClick={() => removeFromCart(item.product, item.variantId)}
                className="p-1.5 rounded-lg text-black/20 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <div className="border-t border-black/8 p-4 bg-white space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-body">
              <span className="text-black/40">Subtotal</span>
              <span className="font-semibold text-primary">
                {formatPrice(subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-xs font-body">
              <span className="text-black/40">Shipping</span>
              <span
                className={`font-semibold ${shipping === 0 ? "text-green-600" : "text-primary"}`}
              >
                {shipping === 0 ? "Free" : `₹${shipping}`}
              </span>
            </div>
             {tax > 0 && (
    <div className="flex justify-between text-xs font-body">
      <span className="text-black/40">GST</span>
      <span className="font-semibold text-primary">{formatPrice(tax)}</span>
    </div>
  )}
            <div className="border-t border-dashed border-black/10 pt-2 flex justify-between items-baseline">
              <span className="font-heading font-bold text-primary text-sm">
                Total
              </span>
              <span className="font-heading font-bold text-primary text-base">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* {shipping > 0 && (
            <p className="text-[11px] font-body text-black/50 bg-gold/8 border border-gold/20 rounded-lg px-3 py-2">
              Add{" "}
              <span className="font-bold text-primary">
                ₹{(499 - subtotal).toLocaleString("en-IN")}
              </span>{" "}
              more for free shipping!
            </p>
          )} */}

          <div className="flex gap-2">
            <Link
              to="/cart"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-body font-semibold text-primary border-2 border-primary/30 hover:bg-primary/5 transition-colors text-center"
            >
              View Cart
            </Link>
            <Link
              to="/checkout"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-body font-bold text-white bg-primary hover:bg-primary/85 transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-primary/20"
            >
              Checkout
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

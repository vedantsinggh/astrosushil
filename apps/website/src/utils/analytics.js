export const trackPurchase = ({
  orderId,
  amount,
  productId,
  productName,
}) => {
  const purchaseKey = `purchase_${orderId}`;

  if (sessionStorage.getItem(purchaseKey)) {
    return;
  }

  window.dataLayer = window.dataLayer || [];

  window.dataLayer.push({
    event: "purchase",

    ecommerce: {
      transaction_id: String(orderId),
      value: Number(amount),
      currency: "INR",

      items: [
        {
          item_id: String(productId || orderId),
          item_name: String(productName || "Astro Sushil Service"),
          price: Number(amount),
          quantity: 1,
        },
      ],
    },
  });

  sessionStorage.setItem(purchaseKey, "true");

  console.log("Purchase Event Fired Successfully", { orderId, amount });
};

// KripFresh's own policy texts. Written for this project (not copied from any other
// service). PLACEHOLDER company details: replace them and have a lawyer review all
// policies before launch.

export const COMPANY = {
  legalName: "KripFresh Retail Private Limited (placeholder)",
  address: "Registered office address to be added, Bengaluru, Karnataka, India",
  supportEmail: "support@kripfresh.example",
  supportPhone: "+91 80000 00000",
  supportHours: "7 am – 11 pm, every day",
  grievanceOfficer: "Name to be appointed",
  grievanceEmail: "grievance@kripfresh.example",
  updated: "26 November 2026",
};

type Section = { h: string; p: string[] };
export type LegalDoc = { slug: string; title: string; intro: string; sections: Section[] };

export const LEGAL_DOCS: LegalDoc[] = [
  {
    slug: "terms",
    title: "Terms of use",
    intro: "These terms apply when you use the KripFresh website or app to order groceries from partner supermarkets near you. Please read them with our Privacy, Refund & cancellation and Delivery policies.",
    sections: [
      { h: "Who we are", p: [`KripFresh is operated by ${COMPANY.legalName}. KripFresh is a marketplace: the partner supermarket you choose sells you the products, and KripFresh provides the platform, payments and delivery. The seller for each order is shown in your cart and on your order.`] },
      { h: "Your account", p: ["You need a delivery address to order, and a mobile number so the rider can reach you. Keep your details accurate. You are responsible for orders placed from your account.", "You must be 18 or older to place an order. Some products may have extra age or quantity limits by law; we may refuse or cancel such orders."] },
      { h: "Stores, prices and availability", p: ["We show only stores within 3 km of your delivery address. Each store sets its own prices and stock, which can change at any time. Prices include taxes.", "Your price is confirmed when you place the order. If a price changes before then, we show you the new total and ask you to confirm; we never charge more than the total you agreed to."] },
      { h: "Charges", p: ["Before you pay, your cart lists every charge: item total, any coupon discount, delivery fee, handling charge, small-cart fee (if your cart is below the minimum) and any tip you choose. We do not add charges after you place the order.", "Tips are optional and go in full to the delivery partner."] },
      { h: "Coupons and offers", p: ["Coupons have conditions such as a minimum order value, a maximum discount or first-order-only use, shown with each coupon. One coupon per order. Coupons have no cash value. If items are removed from an order, your discount is never increased, and your total never goes up."] },
      { h: "KripFresh Plus", p: ["Plus is an optional monthly membership. Its price and benefits are shown before you join. It renews monthly until you cancel. You can cancel any time from your account; benefits continue until the end of the period already paid for, and you won’t be charged again."] },
      { h: "Delivery", p: ["Delivery times are estimates based on the store’s packing time, how busy it is, rider availability and travel distance. See our Delivery policy."] },
      { h: "Cancellations, missing items and refunds", p: ["You can cancel until the store starts packing your order. If an item is unavailable, we follow the choice you made at checkout. See our Refund & cancellation policy."] },
      { h: "Acceptable use", p: ["Don’t misuse the service: no fraudulent orders, abuse of coupons or refunds, or abusive behaviour towards store staff or riders. We may suspend accounts that do."] },
      { h: "Liability", p: ["The seller is responsible for the quality and legality of the products it sells. KripFresh is responsible for running the platform with reasonable care. Nothing in these terms limits rights you have under the Consumer Protection Act, 2019 or other applicable law."] },
      { h: "Changes and disputes", p: ["We may update these terms; the date at the top shows the latest version, and significant changes will be shown in the app. These terms are governed by the laws of India. For complaints, contact customer care or our Grievance Officer."] },
    ],
  },
  {
    slug: "privacy",
    title: "Privacy policy",
    intro: "This policy explains what personal data KripFresh collects, why, and the choices you have. We follow the Digital Personal Data Protection Act, 2023 and other applicable Indian law.",
    sections: [
      { h: "What we collect", p: ["Account details: name and mobile number.", "Delivery details: address, map pin, landmark and instructions.", "Order details: items, payments (we don’t store full card or UPI details), support requests and ratings.", "Location: only if you choose ‘Use my current location’, and only to suggest your address. Delivery partners share their location only during an active delivery."] },
      { h: "Why we use it", p: ["To find stores near you, take and deliver orders, process payments and refunds, provide support, prevent fraud and meet legal obligations. With your consent, we may send you offers; you can opt out at any time."] },
      { h: "Who we share it with", p: ["The store packing your order and the rider delivering it see what they need: your items, address, delivery instructions and phone number. Payment providers process payments. We don’t sell your personal data."] },
      { h: "Your rider’s view, and yours", p: ["You see only the rider assigned to your own order, and only while it is out for delivery. Rider location data is deleted when the delivery is complete."] },
      { h: "How long we keep it", p: ["We keep order records as long as tax and consumer law require, and the rest only as long as needed for the purposes above."] },
      { h: "Your rights", p: [`You can access, correct or delete your data, or withdraw consent, by writing to ${COMPANY.supportEmail}. You can also complain to our Grievance Officer and, if unresolved, to the Data Protection Board of India.`] },
    ],
  },
  {
    slug: "refunds",
    title: "Refund & cancellation policy",
    intro: "We want every order to be right. Here is what happens if you change your mind or something goes wrong.",
    sections: [
      { h: "Cancelling an order", p: ["You can cancel free of charge until the store starts packing. Open the order and tap Cancel order. If you paid online, the full amount is refunded to your original payment method.", "Once packing has started we can’t cancel, but you can report a problem after delivery."] },
      { h: "If the store declines your order", p: ["Sometimes a store can’t take an order (for example, it is out of stock or about to close). You’ll see the reason, and if you paid online, you get a full refund."] },
      { h: "Unavailable items while packing", p: ["At checkout you choose: we contact you about a replacement, or we remove the item. We never substitute without your choice. Removed items are not charged, and your total only goes down."] },
      { h: "Missing, damaged, wrong or poor-quality items", p: ["Report it within 48 hours of delivery from the order screen (Get help with this order). Refunds for items worth up to ₹500 are approved straight away; larger or other requests are reviewed within 24 hours, and we may ask for a photo.", "Fresh produce, dairy and other perishable items can’t be returned for change of mind, but are covered if they arrive damaged or spoiled."] },
      { h: "How refunds are paid", p: ["Refunds go back to your original payment method. Banks and UPI apps usually show them within 3–7 working days. For cash-on-delivery orders, we refund to your UPI ID or bank account."] },
      { h: "Fees", p: ["If you cancel before packing or your order is declined, all fees and tips are refunded too. If an entire order can’t be delivered, the delivery fee, handling charge and tip are refunded."] },
    ],
  },
  {
    slug: "delivery",
    title: "Delivery policy",
    intro: "How delivery works on KripFresh.",
    sections: [
      { h: "Where we deliver", p: ["We deliver only from partner stores within 3.00 km of your delivery address, measured in a straight line. If no store is in range, we tell you before you shop."] },
      { h: "Delivery times", p: ["Before you order, we show an estimated arrival window. It’s based on the store’s packing time, how busy it is, rider availability and travel time. If it changes, we show the new estimate on your tracking screen. Estimates are not guarantees."] },
      { h: "Delivery fee and other charges", p: ["Each store sets a delivery fee and a free-delivery limit, shown in the cart. A ₹5 handling charge applies to every order, and a ₹15 small-cart fee applies to carts under ₹99 (waived for Plus members). Every charge is shown before you pay."] },
      { h: "At your door", p: ["Add your flat number, landmark and any instructions so your rider can find you. If you can’t be reached, the rider will wait a few minutes and try to call. Undelivered orders may be returned to the store; online payments for undelivered orders are refunded, minus any cost we have told you about in advance."] },
      { h: "Tracking", p: ["You can follow every step: order placed, store accepted, packing, ready for pickup, out for delivery and delivered. When the rider shares their location you’ll see it on a map; if the signal drops, we show the last known point and when it was updated."] },
    ],
  },
  {
    slug: "grievance",
    title: "Grievance officer & contact",
    intro: "Under the Consumer Protection (E-Commerce) Rules, 2020, we display these details and handle complaints within set times.",
    sections: [
      { h: "Customer care", p: [`Email ${COMPANY.supportEmail}, phone ${COMPANY.supportPhone} (${COMPANY.supportHours}). For order problems, the quickest route is Get help with this order on the order screen.`] },
      { h: "Grievance Officer", p: [`${COMPANY.grievanceOfficer}. Email ${COMPANY.grievanceEmail}. We acknowledge complaints within 48 hours and aim to resolve them within one month.`] },
      { h: "Company details", p: [`${COMPANY.legalName}, ${COMPANY.address}.`] },
      { h: "Sellers", p: ["Products are sold by the partner supermarket shown on your order. Its name, address and contact details are shown on the order and invoice."] },
    ],
  },
];

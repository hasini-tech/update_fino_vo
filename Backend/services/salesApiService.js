class SalesApiService {
  constructor(platform, config) {
    this.platform = platform;
    this.config = config;
  }

  async testConnection() {
    try {
      switch (this.platform) {
        case 'shopify':
          return await this.testShopifyConnection();
        case 'woocommerce':
          return await this.testWoocommerceConnection();
        case 'stripe':
          return await this.testStripeConnection();
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } catch (error) {
      console.error(`Connection test failed for ${this.platform}:`, error);
      throw error;
    }
  }

  async fetchSalesData(fromDate, toDate) {
    try {
      switch (this.platform) {
        case 'shopify':
          return await this.fetchShopifySales(fromDate, toDate);
        case 'woocommerce':
          return await this.fetchWoocommerceSales(fromDate, toDate);
        case 'stripe':
          return await this.fetchStripeSales(fromDate, toDate);
        default:
          throw new Error(`Unsupported platform: ${this.platform}`);
      }
    } catch (error) {
      console.error(`Sales data fetch failed for ${this.platform}:`, error);
      throw error;
    }
  }

  // Shopify API Integration
  async testShopifyConnection() {
    const response = await fetch(`${this.config.storeUrl}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': this.config.accessToken,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchShopifySales(fromDate, toDate) {
    const fromDateISO = new Date(fromDate).toISOString();
    const toDateISO = new Date(toDate).toISOString();
    
    const response = await fetch(
      `${this.config.storeUrl}/admin/api/2023-10/orders.json?` +
      `status=any&created_at_min=${fromDateISO}&created_at_max=${toDateISO}&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': this.config.accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformShopifyData(data.orders);
  }

  transformShopifyData(orders) {
    return orders.map(order => ({
      platform: 'shopify',
      productName: order.line_items?.[0]?.title || 'Unknown Product',
      productId: order.line_items?.[0]?.product_id?.toString(),
      quantity: order.line_items?.[0]?.quantity || 1,
      amount: parseFloat(order.total_price) || 0,
      currency: order.currency || 'INR',
      orderId: order.id?.toString(),
      customerEmail: order.email,
      date: new Date(order.created_at),
      status: order.financial_status || 'pending',
      metadata: {
        order_number: order.order_number,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status
      }
    }));
  }

  // WooCommerce API Integration
  async testWoocommerceConnection() {
    const response = await fetch(`${this.config.storeUrl}/wp-json/wc/v3/system_status`, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.apiKey}:${this.config.secretKey}`)}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchWoocommerceSales(fromDate, toDate) {
    const fromDateStr = new Date(fromDate).toISOString().split('T')[0];
    const toDateStr = new Date(toDate).toISOString().split('T')[0];
    
    const response = await fetch(
      `${this.config.storeUrl}/wp-json/wc/v3/orders?` +
      `after=${fromDateStr}T00:00:00&before=${toDateStr}T23:59:59&per_page=100`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.apiKey}:${this.config.secretKey}`)}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformWoocommerceData(data);
  }

  transformWoocommerceData(orders) {
    return orders.map(order => ({
      platform: 'woocommerce',
      productName: order.line_items?.[0]?.name || 'Unknown Product',
      productId: order.line_items?.[0]?.product_id?.toString(),
      quantity: order.line_items?.[0]?.quantity || 1,
      amount: parseFloat(order.total) || 0,
      currency: order.currency || 'INR',
      orderId: order.id?.toString(),
      customerEmail: order.billing?.email,
      date: new Date(order.date_created),
      status: order.status,
      metadata: {
        order_key: order.order_key,
        payment_method: order.payment_method,
        billing: order.billing
      }
    }));
  }

  // Stripe API Integration
  async testStripeConnection() {
    const response = await fetch('https://api.stripe.com/v1/balance', {
      headers: {
        'Authorization': `Bearer ${this.config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchStripeSales(fromDate, toDate) {
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents?` +
      `created[gte]=${fromTimestamp}&created[lte]=${toTimestamp}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Stripe API error: ${response.statusText}`);
    }

    const data = await response.json();
    return this.transformStripeData(data.data);
  }

  transformStripeData(paymentIntents) {
    return paymentIntents
      .filter(payment => payment.status === 'succeeded')
      .map(payment => ({
        platform: 'stripe',
        productName: payment.description || 'Stripe Payment',
        productId: payment.id,
        quantity: 1,
        amount: payment.amount / 100, // Convert from cents
        currency: payment.currency?.toUpperCase() || 'INR',
        orderId: payment.id,
        customerEmail: payment.receipt_email,
        date: new Date(payment.created * 1000),
        status: 'completed',
        metadata: {
          payment_method: payment.payment_method_types?.[0],
          receipt_url: payment.receipt_url
        }
      }));
  }
}

export default SalesApiService;
app.service("ShoppingCart", ["$http", "Site", "$rootScope", function($http, $site, $rootScope) {
  var ShoppingCart = {};

  var allShippingOptions = [
    { shippingMethod: 'standard', description: 'Free shipping - 12 days', cost: 0, costPerAdditional: 0, timeframe: 12 },
    { shippingMethod: 'priority', description: 'Priority - 4 days', cost: 8.95, costPerAdditional: 7.00, timeframe: 4 }
  ];

  var cart = {
    items: [],
    discountCode: null,
    discountDescription: undefined,
    shipping: undefined,
    total: null,
    salesTax: 0,
    shipZip: undefined,
    shipCountry: 'US',
    shipAddressId: undefined,
    shippingMethod: 'standard',
    shippingOptions: allShippingOptions,
    paymentInfoId: undefined
  };

  var localCart = {};
  var freeShipping = false;
  var pctDiscount = 0;
  var flatDiscount = 0;

  ShoppingCart.loadCart = function(callback) {
    pruneCart();
    var cartStr = localStorage.getItem('cart');
    if (cartStr) {
      localCart = JSON.parse(cartStr);
      cart.items = localCart.items.map(function(itemGuid) {
        var itemStr = localStorage.getItem('item' + itemGuid);
        if (itemStr) {
          return JSON.parse(itemStr);
        }
        return null;
      }).filter(function(item) {
        return item != null;
      });
      cart.shipZip = localCart.shipZip;
      cart.shipAddressId = localCart.shipAddressId;
      cart.billingId = localCart.billingId;

      ShoppingCart.applyDiscountCode(localCart.discountCode, function() {
        calculateCart();
        if (callback) {
          callback(cart);
        }
      });
    }
  }

  function pruneCart() {
    var cartStr = localStorage.getItem('cart');
    if (cartStr) {
      var tmpCart = JSON.parse(cartStr);
      var i = 0;
      while (i < tmpCart.items.length) {
        var itemStr = localStorage.getItem('item' + tmpCart.items[i]);
        if (!itemStr) {
          tmpCart.items.splice(i, 1);
        }
        else {
          i++;
        }
      }
      localStorage.setItem('cart', JSON.stringify(tmpCart));
    }
  }

  function calculateCart() {
    cart.subtotal = 0;
    if (cart.items) {
      cart.subtotal = cart.items.reduce(function(runningTotal, current) {
        if (!current) {
          return runningTotal;
        }
        return Number(runningTotal) + (current.qty * current.price);
      }, 0);
    }
    if (!cart.shipping || freeShipping) {
      cart.shipping = 0;
    }
    if (pctDiscount) {
      cart.discount = pctDiscount * cart.subtotal;
    }
    if (flatDiscount) {
      cart.discount = Math.min(flatDiscount, Number(cart.subtotal) + Number(cart.shipping) + Number(cart.salesTax));
    }
    cart.total = Number(cart.subtotal);
    if (cart.shipping) {
      cart.total +=  Number(cart.shipping);
    }
    if (cart.salesTax) {
      cart.total += Number(cart.salesTax);
    }
    if (cart.discount) {
      cart.total -= Number(cart.discount);
    }
  }

  ShoppingCart.loadShippingQuote = function(shippingMethod, callback) {
    ShoppingCart.loadCart(function(cart) {
      var s = allShippingOptions.find(function(opt) {
        return opt.shippingMethod == shippingMethod;
      });
      if (!s) {
        s = getStandardShipping();
      }
      var totalItems = cart.items.reduce(function(runningTotal, current) {
        return Number(runningTotal) + current.qty;
      }, 0);
      cart.shipping = s.cost + (s.costPerAdditional * (totalItems - 1));

      calculateCart();

      if (callback) {
        callback(cart);
      }
    });
  }

  ShoppingCart.removeItem = function(guid, callback) {
    localStorage.removeItem('item' + guid);
    localCart.items.splice(localCart.items.indexOf(guid), 1);
    localStorage.setItem('cart', JSON.stringify(localCart));
    ShoppingCart.loadCart(callback);
  }

  ShoppingCart.removeDiscountCode = function(callback) {
    newDiscountCode = undefined;
    discount = 0;
    pctDiscount = 0;
    flatDiscount = 0;
    localCart.discountCode = undefined;
    localCart.discountDescription = undefined;
    cart.discountCode = undefined;
    cart.discountDescription = undefined;
    localStorage.setItem('cart', JSON.stringify(localCart));
    ShoppingCart.loadCart(callback);
  }

  ShoppingCart.updateQuantity = function(guid, qty, callback) {
    var item = cart.items.find(function(itm) {
      return itm.guid == guid;
    });
    if (item) {
      item.qty = qty;
      localStorage.setItem('item' + item.guid, JSON.stringify(item));
    }
  }

  ShoppingCart.applyDiscountCode = function(newDiscountCode, callback) {
    if (!newDiscountCode) {
      if (callback) {
        callback();
      }
      return;
    }

    $http.post(API_URL + "/Cart/validate_discount_code", {
      discountCode: newDiscountCode
    }).then(function(response) {
      if (response.data.results) {
        if (response.data.results.freeShipping) {
          freeShipping = true;
        }
        if (response.data.results.pctDiscount) {
          pctDiscount = Number(response.data.results.pctDiscount);
        }
        if (response.data.results.flatDiscount) {
          flatDiscount = Number(response.data.results.flatDiscount);
        }
        localCart.discountCode = response.data.results.discountCode;
        localCart.discountDescription = response.data.results.discountDescription;
        localStorage.setItem('cart', JSON.stringify(localCart));
        cart.discountCode = localCart.discountCode;
        cart.discountDescription = localCart.discountDescription;
        calculateCart();
        if (callback) {
          callback(cart);
        }
      }
      else {
        $site.displayNotification("Invalid discount code");
        if (callback) {
          callback();
        }
      }
    }, function(error) {
      console.error(error);
    });
  }

  function updateCartShipZip(shipZip) {
    cart.shipZip = shipZip;
    localCart.shipZip = shipZip;
    localStorage.setItem('cart', JSON.stringify(localCart));
  }

  ShoppingCart.updateShippingAddress = function(address) {
    updateCartShipZip(address.postalCode);
    cart.shipAddressId = address.id;
    localCart.shipAddressId = address.id;
    localStorage.setItem('cart', JSON.stringify(localCart));
    $rootScope.$broadcast("updateShippingAddress", address.id);
  }

  ShoppingCart.updateBillingInfo = function(card) {
    card.billingId = card.id;
    localCart.billingId = card.id;
    localStorage.setItem('cart', JSON.stringify(localCart));
    $rootScope.$broadcast("updateBillingInfo", card.id);
  }

  ShoppingCart.getShipAddressId = function() {
    var cartStr = localStorage.getItem('cart');
    if (cartStr) {
      localCart = JSON.parse(cartStr);
      if (localCart.shipAddressId) {
        return localCart.shipAddressId;
      }
    }
    return undefined;
  }

  ShoppingCart.getBillingId = function() {
    var cartStr = localStorage.getItem('cart');
    if (cartStr) {
      localCart = JSON.parse(cartStr);
      if (localCart.billingId) {
        return localCart.billingId;
      }
    }
    return undefined;
  }

  ShoppingCart.emptyCart = function() {
    var cartStr = localStorage.getItem('cart');
    if (cartStr) {
      localCart = JSON.parse(cartStr);
      localCart.items.forEach(function(item) {
        localStorage.removeItem('item' + item.guid);
      });
      localStorage.removeItem('cart');
    }
  }

  function getStandardShipping() {
    var s = allShippingOptions.find(function(opt) {
      return opt.shippingMethod == 'standard';
    });
    return s;
  }

  return ShoppingCart;
}]);

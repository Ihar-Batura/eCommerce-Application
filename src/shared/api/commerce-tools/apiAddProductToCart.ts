import { commercetoolsConfig } from './config';
import { getTokenFromLS } from '../local-storage/getTokenFromLS';
import { getCartIdFromLS } from '../local-storage/getCartIdFromLS';
import { apiGetCartById } from './apiGetCartById';
import { handleCatchError } from '@components/ui/error/catchError';

export async function apiAddProductToCart(
  productId: string,
  quantity: number = 1,
  version?: number
): Promise<number | void> {
  const accessToken = getTokenFromLS();
  const cartId = getCartIdFromLS();

  if (!accessToken || !cartId) {
    throw new Error('No access token found or cart id');
  }

  const currentCart = await apiGetCartById();
  if (!currentCart) throw new Error('No access to cart');

  const CurrentVersion = version ?? currentCart.version;

  const apiUrl = commercetoolsConfig.apiUrl;
  const projectKey = commercetoolsConfig.projectKey;
  const url = `${apiUrl}/${projectKey}/me/carts/${cartId}`;

  try {
    const requestBody = {
      version: CurrentVersion,
      actions: [
        {
          action: 'addLineItem',
          productId: productId,
          variantId: 1,
          quantity: quantity,
          supplyChannel: {
            typeId: 'channel',
            id: '03371898-0c7c-4ef1-97e0-f677e704aaac',
          },
          distributionChannel: {
            typeId: 'channel',
            id: '1b29c225-1540-46de-bc0c-11116a384586',
          },
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();
    if (result) return result.version;
  } catch (error) {
    handleCatchError(error, 'Error adding product to cart');
  }
}

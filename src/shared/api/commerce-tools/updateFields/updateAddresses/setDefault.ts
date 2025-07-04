import { Customer } from '@pages/profile/Profile';
import { commercetoolsConfig } from '../../config';

interface UpdateCustomerData {
  version: number;
  actions: CustomerUpdateAction[];
}

interface CustomerUpdateAction {
  action: string;
  addressId?: string;
  addressKey?: string;
}

type DefaultAddressOperation = 'setDefaultBilling' | 'setDefaultShipping';

export async function setDefaultAddress(
  operation: DefaultAddressOperation,
  addressIdentifier: string,
  customerId: string,
  version: number
): Promise<Customer | null> {
  const accessToken = localStorage.getItem('authDysonToken');

  if (!accessToken) {
    throw new Error('Authentication required');
  }

  const apiUrl = commercetoolsConfig.apiUrl;
  const projectKey = commercetoolsConfig.projectKey;
  const url = `${apiUrl}/${projectKey}/customers/${customerId}`;

  if (!addressIdentifier) {
    throw new Error('Either addressId must be provided');
  }

  const actionMap = {
    setDefaultBilling: 'setDefaultBillingAddress',
    setDefaultShipping: 'setDefaultShippingAddress',
  };

  const action: CustomerUpdateAction = {
    action: actionMap[operation],
    addressId: addressIdentifier,
  };

  const updateData: UpdateCustomerData = {
    version,
    actions: [action],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('authDysonToken');
    }
    throw new Error(response.status.toString());
  }

  return await response.json();
}

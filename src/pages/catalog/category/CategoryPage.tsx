import styles from './CategoryPage.module.scss';
import { useState, useEffect } from 'react';
import { getProductsByIdCategory } from '@shared/api/commerce-tools/getProductsByIdCategory';
import { getTokenFromLS } from '@shared/api/local-storage/getTokenFromLS';
import { commercetoolsConfig } from '@shared/api/commerce-tools/config';
import {
  ProductsByCategory,
  CardInfo,
  CartLineItem,
} from '@shared/types/types';
import { Card } from '@components/ui/cards/Card';
import { getNameByPath } from '@shared/constants/categories';
import { Breadcrumbs } from '@components/ui/breadcrumbs/Breadcrumbs';
import { Pagination } from '@mui/material';
import { getCartIdFromLS } from '@shared/api/local-storage/getCartIdFromLS';
import { apiGetCartById } from '@shared/api/commerce-tools/apiGetCartById';
import { handleCatchError } from '@components/ui/error/catchError';

export const CategoryPage = ({ page }: { page: string }) => {
  const [productsData, setProductsData] = useState<ProductsByCategory | null>(
    null
  );
  const [offset, setOffset] = useState(0);
  const [lineItemsInCart, setLineItemsInCart] = useState<CartLineItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const path = `/catalog/${page}`;

  const breadcrumbItems = [
    { path: '/', name: 'Home' },
    { path: '/catalog', name: 'Catalog' },
    { path: '', name: getNameByPath(path) },
  ];

  useEffect(() => {
    setOffset(0);
    setCurrentPage(1);
  }, [page]);

  useEffect(() => {
    const fetchProductsData = async () => {
      const token = getTokenFromLS();

      const idCategory = (() => {
        switch (page) {
          case 'vacuums':
            return commercetoolsConfig.idCategoryVacuums;
          case 'hair-care':
            return commercetoolsConfig.idCategoryHairBeauty;
          case 'heater':
            return commercetoolsConfig.idCategoryAirHeaters;
          case 'headphones':
            return commercetoolsConfig.idCategoryHeadphones;
          case 'lighting':
            return commercetoolsConfig.idCategoryLighting;
          default:
            return '';
        }
      })();

      if (!idCategory || !token) {
        return;
      }

      try {
        const data = await getProductsByIdCategory({
          idCategory,
          token,
          offset,
        });
        setProductsData(data);
      } catch (error) {
        handleCatchError(error, 'Error get products category by ID');
      }
    };

    fetchProductsData();
  }, [page, offset]);

  useEffect(() => {
    const getCartLineItems = async () => {
      try {
        const cartId = getCartIdFromLS();
        if (!cartId) return;

        const cart = await apiGetCartById();
        if (!cart?.lineItems) return;

        setLineItemsInCart(cart.lineItems);
      } catch (error) {
        handleCatchError(error, 'Error get cart line items');
      }
    };

    getCartLineItems();
  }, [page, offset]);

  if (!productsData) {
    return <div className={styles.textLoading}>Loading...</div>;
  }

  const arrCardsInfo = productsData.results;

  const handleChangePageNumber = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    const offset = page === 1 ? 0 : (page - 1) * 4;

    setOffset(offset);
    setCurrentPage(page);
  };

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <div>
        <div className={styles.container}>
          {arrCardsInfo.map((card: CardInfo) => (
            <Card
              key={card.id}
              id={card.id}
              name={card.name['en-US']}
              description={card.description['en-US']}
              price={card.masterVariant?.prices?.[0]?.value?.centAmount ?? 0}
              discountedPrice={
                card.masterVariant?.prices?.[0]?.discounted?.value
                  ?.centAmount ?? null
              }
              src={card.masterVariant?.images?.[0]?.url ?? '/dyson_icon.svg'}
              isInCart={lineItemsInCart.some(
                (item) => item.productId === card.id
              )}
            />
          ))}
        </div>
        <Pagination
          count={Math.ceil(productsData?.total / 4)}
          onChange={handleChangePageNumber}
          className={styles.pagination}
          page={currentPage}
          sx={{
            '& .MuiPagination-ul': {
              justifyContent: 'end',
            },
            display: { xs: 'flex', md: 'block' },
            justifyContent: 'end',
          }}
        />
      </div>
    </>
  );
};

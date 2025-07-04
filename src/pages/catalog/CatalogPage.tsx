import styles from './CatalogPage.module.scss';
import { useState, useEffect } from 'react';
import {
  ProductsByCategory,
  CardInfo,
  CartLineItem,
} from '@shared/types/types';
import { getTokenFromLS } from '@shared/api/local-storage/getTokenFromLS';
import { getSearchedProducts } from '@shared/api/commerce-tools/getSearchedProducts';

import { Card } from '@components/ui/cards/Card';
import { SortByComponent } from '@components/ui/sort/SortByComponent';
import { TextField, FormControlLabel, Switch, Pagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PriceRangeSlider } from '@components/ui/sort/range-slider/PriceRangeSlider';
import { ColorRange } from '@components/ui/sort/color-range/ColorRange';
import { Breadcrumbs } from '@components/ui/breadcrumbs/Breadcrumbs';
import { buildSearchParams } from '@shared/utlis/searchParamsBuilder';
import { apiGetCartById } from '@shared/api/commerce-tools/apiGetCartById';
import { getCartIdFromLS } from '@shared/api/local-storage/getCartIdFromLS';
import { handleCatchError } from '@components/ui/error/catchError';

export type SortOption =
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'normal';

export const CatalogPage = () => {
  const [productsData, setProductsData] = useState<ProductsByCategory | null>(
    null
  );
  const [sortOption, setSortOption] = useState<SortOption>('normal');
  const [searchText, setSearchText] = useState('');
  const [priceRange, setPriceRange] = useState([0, 0]);
  const [discount, setDiscount] = useState(false);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [paginationOffset, setPaginationOffset] = useState(0);
  const [lineItemsInCart, setLineItemsInCart] = useState<CartLineItem[]>([]);

  const breadcrumbItems = [
    { path: '/', name: 'Home' },
    { path: '/catalog', name: 'Catalog' },
  ];

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const fetchProductsData = async () => {
        const token = getTokenFromLS();
        if (!token) return;

        try {
          const limit = 12;
          const params = buildSearchParams({
            searchText,
            sortOption,
            priceRange,
            discount,
            selectedColors,
            paginationOffset,
            limit,
          });
          const data = await getSearchedProducts({ params, token });
          setProductsData(data);
        } catch (error) {
          handleCatchError(error, 'Error fetching search products');
        }
      };

      fetchProductsData();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [
    searchText,
    sortOption,
    priceRange,
    discount,
    selectedColors,
    paginationOffset,
  ]);

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
  }, [
    searchText,
    sortOption,
    priceRange,
    discount,
    selectedColors,
    paginationOffset,
  ]);

  if (!productsData) {
    return <div className={styles.textLoading}>Loading...</div>;
  }

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
    setPaginationOffset(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
    setPaginationOffset(0);
  };

  const handlePriceChange = (newValues: [number, number]) => {
    setPriceRange(newValues);
    setPaginationOffset(0);
  };

  const toggleDiscount = () => {
    setDiscount(!discount);
    setPaginationOffset(0);
  };

  const handleClearFilter = () => {
    setSearchText('');
    setPriceRange([0, 0]);
    setDiscount(false);
    setSelectedColors([]);
    setPaginationOffset(0);
  };

  const handleChangePageNumber = (
    _event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    const offset = page === 1 ? 0 : (page - 1) * 12;
    setPaginationOffset(offset);
    setPaginationOffset(0);
  };

  const colorFacet = productsData.facets?.['variants.attributes.color'];
  const allColors: string[] = [];
  if (colorFacet && 'terms' in colorFacet && colorFacet.terms.length > 0) {
    colorFacet.terms.forEach((el) => {
      allColors.push(el.term);
    });
  }

  const sortedColors = [...allColors].sort((a, b) => a.localeCompare(b));

  const priceFacet = productsData.facets?.['variants.price.centAmount'];

  let minPrice = 0;
  let maxPrice = 9999;

  if (priceFacet && 'ranges' in priceFacet && priceFacet.ranges.length > 0) {
    const range = priceFacet.ranges[0];
    minPrice = Math.floor(range.min / 100);
    maxPrice = Math.ceil(range.max / 100);
  }

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <div className={styles.container}>
        <div className={styles.filterContainer}>
          <TextField
            label="Search.."
            variant="outlined"
            value={searchText}
            onChange={handleSearchChange}
            size="small"
            slotProps={{
              input: {
                endAdornment: <SearchIcon />,
              },
            }}
            sx={{ width: '100%' }}
          />

          <FormControlLabel
            control={
              <Switch
                checked={discount}
                onChange={toggleDiscount}
                sx={{
                  '& .Mui-checked .MuiSwitch-thumb': {
                    color: '#595079',
                  },
                  '.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#595079',
                  },
                }}
              />
            }
            label="Only with discount"
            sx={{
              '.MuiFormControlLabel-label': {
                fontSize: '14px',
                fontWeight: '500',
                color: '#595079',
              },
            }}
          />

          <ColorRange
            colors={sortedColors}
            selectedColors={selectedColors}
            onChange={(colors) => setSelectedColors(colors)}
          />

          <PriceRangeSlider
            min={minPrice}
            max={maxPrice}
            onChange={handlePriceChange}
          />
          <button className={styles.button} onClick={handleClearFilter}>
            Clear Filters
          </button>
        </div>
        <div className={styles.sortAndCardsContainer}>
          <SortByComponent
            sortOption={sortOption}
            onSortChange={handleSortChange}
          />
          <div className={styles.cardsContainer}>
            {productsData.results.map((card: CardInfo) => (
              <Card
                key={card.id}
                id={card.id}
                name={card.name['en-US']}
                description={card.description['en-US'] ?? 'Product description'}
                price={card.masterVariant?.prices.at(0)?.value?.centAmount ?? 0}
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
            <Pagination
              count={Math.ceil(productsData?.total / 12)}
              onChange={handleChangePageNumber}
              className={styles.pagination}
              sx={{
                '& .MuiPagination-ul': {
                  justifyContent: 'end',
                },
                display: { xs: 'flex', md: 'block' },
                justifyContent: 'end',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

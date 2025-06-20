import styles from './Product.module.scss';
import { useState, useEffect } from 'react';
import { getProductDataById } from '@shared/api/commerce-tools/getProductDataById';
import { getTokenFromLS } from '@shared/api/local-storage/getTokenFromLS';
import ProductTitle from '@components/layout/product/title/ProductTitle';
import { ButtonBack } from '@components/ui/buttons/ButtonBack';
import ProductCard from '@components/layout/product/card/ProductCard';
import { Slider } from '@components/layout/product/slider/Slider';
import { ProductData, ProductImage } from '@shared/types/types';
import Benefits from '@components/layout/product/benefits/Benefits';
import { handleCatchError } from '@components/ui/error/catchError';
import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '@components/ui/breadcrumbs/Breadcrumbs';
import { catalogCategories } from '@shared/constants/categories';

export const ProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const [productData, setProductData] = useState<ProductData | null>(null);

  useEffect(() => {
    const fetchProductData = async () => {
      const token = getTokenFromLS();

      if (!token || !productId) {
        return;
      }

      try {
        const data = await getProductDataById({ id: productId, token });
        setProductData(data);
      } catch (error) {
        handleCatchError(error, 'Error get product by ID');
      }
    };

    fetchProductData();
  }, [productId]);

  if (!productData) {
    return <div className={styles.textLoading}>Loading...</div>;
  }

  const currentPath = productData.masterData.current;

  const name = currentPath.name?.['en-US'] ?? 'Product name';
  const categoryId = productData.masterData.current.categories?.[0]?.id;

  let breadcrumbItems;

  if (categoryId && catalogCategories.get(categoryId)) {
    const category = catalogCategories.get(categoryId);
    breadcrumbItems = [
      { path: '/', name: 'Home' },
      { path: '/catalog', name: 'Catalog' },
      {
        path: category?.path ?? '/catalog',
        name: category?.name ?? '',
      },
      { path: '', name: name },
    ];
  } else {
    breadcrumbItems = [
      { path: '/', name: 'Home' },
      { path: '/catalog', name: 'Catalog' },
      { path: '', name: name },
    ];
  }

  const price = currentPath.masterVariant?.prices?.[0]?.value?.centAmount
    ? currentPath.masterVariant.prices[0].value.centAmount / 100
    : 0;

  const discountedPrice = currentPath.masterVariant?.prices?.[0]?.discounted
    ?.value?.centAmount
    ? currentPath.masterVariant.prices[0].discounted.value.centAmount / 100
    : null;

  const description =
    currentPath.description?.['en-US'] ?? 'No description available';

  const sliderImages = currentPath.masterVariant?.images?.map(
    (img: ProductImage) => ({
      src: img.url,
      alt: 'Product image',
    })
  ) ?? [{ src: 'dyson_icon.svg', alt: 'Default image' }];

  const variantData =
    currentPath.variants?.map((variant) => {
      const imageUrl = variant.images?.at(0)?.url ?? 'dyson_icon.svg';
      const variantName = variant.key ?? variant.sku ?? 'Unnamed variant';

      return {
        iconUrl: imageUrl,
        name: variantName,
      };
    }) ?? [];

  return (
    <>
      <ProductTitle name={name} price={discountedPrice ?? price} />
      <Breadcrumbs items={breadcrumbItems} />
      <div className={styles.container}>
        <ButtonBack />
        <div className={styles.productContainer}>
          <ProductCard
            id={productId}
            name={name}
            description={description}
            price={price}
            discountedPrice={discountedPrice}
            variants={variantData}
          />
          <Slider images={sliderImages} />
        </div>
      </div>
      <Benefits />
    </>
  );
};

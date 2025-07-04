import { Button, Box } from '@mui/material';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { InputText } from '@components/ui/inputs/inputText';
import InputPhone from '@components/ui/inputs/inputPhone';
import InputEmail from '@components/ui/inputs/InputEmail';
import InputDate from '@components/ui/inputs/datePicker';
import dayjs from 'dayjs';
import { Customer } from '@pages/profile/Profile';
import {
  birthValidationSchema,
  emailValidationSchema,
  passwordValidationSchema,
  phoneValidationSchema,
  textValidationSchema,
} from '@shared/lib/validator/validator';
import { updateEmail } from '@shared/api/commerce-tools/updateFields/updateEmail';
import { updateField } from '@shared/api/commerce-tools/updateFields/updateField';
import { useState, useMemo, useEffect } from 'react';
import InputPassword from '@components/ui/inputs/InputPassword';
import generatePassword from '@shared/utlis/password-generator';
import { updateCustomerPhone } from '@shared/api/commerce-tools/updateFields/updatePhone.';
import { updatePassword } from '@shared/api/commerce-tools/updateFields/updatePassword';
import { userAuthorization } from '@shared/api/commerce-tools/authorization';
import { PasswordConfirmModal } from '@components/ui/modals/ModalWithPassword';
import styles from '../register-form/RegisterForm.module.scss';
import ShowDialog from '@components/ui/modals/Modal';
import { loadPassword } from '@shared/api/local-storage/getPasswordFromLS';
import { encryptData } from '@shared/lib/password/encryption';

interface PersonalInfoFormProps {
  customer: Customer;
  version: number;
  onSave?: (updatedData: Partial<Customer>) => void;
}

interface FormValues {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password?: string;
  dateOfBirth: Date;
}

export const PersonalInfoForm = ({
  customer,
  version: initialVersion,
  onSave,
}: PersonalInfoFormProps) => {
  const [version, setVersion] = useState(
    (initialVersion || customer.version) ?? 1
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>(
    undefined
  );
  const [savedPassword, setSavedPassword] = useState(loadPassword());
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingPassword, setPendingPassword] = useState<string>('');
  const [error, setError] = useState<{
    text: string;
    action?: () => void;
  } | null>(null);

  const defaultValues = useMemo(
    () => ({
      email: customer.email ?? '',
      password: '',
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
      phone: customer.custom?.fields.phone ?? '',
      dateOfBirth: customer.dateOfBirth
        ? new Date(customer.dateOfBirth)
        : new Date(dayjs().subtract(18, 'year').toDate()),
    }),
    [customer]
  );

  const schema = yup.object().shape({
    firstName: textValidationSchema,
    lastName: textValidationSchema,
    email: emailValidationSchema,
    phone: phoneValidationSchema,
    dateOfBirth: birthValidationSchema,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const formValues = watch();

  useEffect(() => {
    setValue('password', savedPassword, { shouldDirty: false });
  }, [savedPassword, setValue]);

  useEffect(() => {
    const validatePassword = async () => {
      if (
        formValues.password &&
        formValues.password !== defaultValues.password
      ) {
        try {
          await passwordValidationSchema.validate(formValues.password);
          setPasswordError(undefined);
        } catch (err) {
          if (err instanceof yup.ValidationError) {
            setPasswordError(err.message);
          }
        }
      } else setPasswordError(undefined);
    };

    validatePassword();
  }, [formValues.password, defaultValues.password]);

  const handleSave: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const changedFields = getChangedFields();

      if (passwordError || Object.keys(changedFields).length === 0) {
        setIsSubmitting(false);
        return;
      }

      const partialSchema = getPartialValidationSchema(changedFields);
      await partialSchema.validate(changedFields, { abortEarly: false });

      let currentVersion = version;
      const updatedData: Partial<Customer> = {};

      if (changedFields.password) {
        setPendingPassword(changedFields.password);
        setPasswordModalOpen(true);
        return;
      }

      if (changedFields.email) {
        const response = await updateEmail(
          changedFields.email,
          customer.id,
          currentVersion
        );
        currentVersion = response?.version ?? 1;
        updatedData.email = changedFields.email;
      }

      if (changedFields.firstName) {
        const response = await updateField(
          changedFields.firstName,
          customer.id,
          currentVersion,
          'setFirstName'
        );
        currentVersion = response?.version ?? 1;
        updatedData.firstName = changedFields.firstName;
      }

      if (changedFields.lastName) {
        const response = await updateField(
          changedFields.lastName,
          customer.id,
          currentVersion,
          'setLastName'
        );

        currentVersion = response?.version ?? 1;
        updatedData.lastName = changedFields.lastName;
      }

      if (changedFields.phone) {
        const response = await updateCustomerPhone(
          changedFields.phone,
          customer.id,
          currentVersion
        );
        currentVersion = response?.version ?? 1;
        updatedData.custom = {
          ...customer.custom,
          fields: {
            ...customer.custom?.fields,
            phone: changedFields.phone ?? '',
          },
        };
      }

      if (changedFields.dateOfBirth) {
        const newDate = dayjs(changedFields.dateOfBirth).format('YYYY-MM-DD');
        const response = await updateField(
          newDate,
          customer.id,
          currentVersion,
          'setDateOfBirth'
        );

        currentVersion = response?.version ?? 1;
        updatedData.dateOfBirth = newDate;
      }

      setVersion(currentVersion);
      onSave?.({ ...updatedData, version: currentVersion });
      reset(data);
    } catch {
      setError({
        text: 'Failed to update profile',
        action: () => setError(null),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordConfirm = async (currentPassword: string) => {
    try {
      if (!pendingPassword) return;

      const response = await updatePassword(
        pendingPassword,
        currentPassword,
        customer.id,
        version
      );

      if (!response?.version) throw new Error('Failed to update password');

      const newVersion = response.version;
      setVersion(newVersion);

      const authResponse = await userAuthorization(
        {
          email: customer.email,
          password: pendingPassword,
        },
        'Password updated successfully'
      );

      localStorage.setItem('password', encryptData(pendingPassword));
      setSavedPassword(pendingPassword);

      if (!authResponse) throw new Error('Authorization failed');

      localStorage.setItem('authDysonToken', authResponse.access_token);

      onSave?.({
        password: pendingPassword,
        version: newVersion,
      });
      setPasswordModalOpen(false);
      setPendingPassword(loadPassword());

      reset({ ...formValues });
    } catch {
      setError({
        text: 'Password confirmation failed',
        action: () => setError(null),
      });
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setValue('password', newPassword, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const getChangedFields = (): Partial<FormValues> => {
    const changedFields: Partial<FormValues> = {};
    const keys: Array<keyof FormValues> = [
      'email',
      'firstName',
      'lastName',
      'phone',
      'password',
      'dateOfBirth',
    ];

    keys.forEach((fieldKey) => {
      const currentValue = formValues[fieldKey];
      const defaultValue = defaultValues[fieldKey];

      if (fieldKey === 'dateOfBirth') {
        const currentDate =
          currentValue instanceof Date
            ? currentValue
            : new Date(currentValue ?? '');
        const defaultDate =
          defaultValue instanceof Date ? defaultValue : new Date(defaultValue);
        if (currentDate.getTime() !== defaultDate.getTime()) {
          changedFields[fieldKey] = currentDate;
        }
      } else if (currentValue !== defaultValue) {
        changedFields[fieldKey] = currentValue?.toString();
      }
    });

    return changedFields;
  };

  const getPartialValidationSchema = (changedFields: Partial<FormValues>) => {
    const schemaShape: yup.ObjectShape = {};
    if ('email' in changedFields) schemaShape.email = emailValidationSchema;
    if ('password' in changedFields)
      schemaShape.password = passwordValidationSchema;
    if ('firstName' in changedFields)
      schemaShape.firstName = textValidationSchema;
    if ('lastName' in changedFields)
      schemaShape.lastName = textValidationSchema;
    if ('phone' in changedFields) schemaShape.phone = phoneValidationSchema;
    if ('dateOfBirth' in changedFields)
      schemaShape.dateOfBirth = birthValidationSchema;
    return yup.object().shape(schemaShape);
  };

  return (
    <>
      <Box
        component="form"
        onSubmit={handleSubmit(handleSave)}
        className={`${styles.registerForm} ${styles.updateArea}`}
      >
        <h5>Update Personal Information</h5>
        <div className={styles.formArea}>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <InputEmail
                label="Email"
                value={field.value}
                onChange={field.onChange}
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />
          <Box className={styles.password}>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <InputPassword
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={!!passwordError}
                  helperText={passwordError}
                />
              )}
            />
            <Button
              onClick={handleGeneratePassword}
              variant="outlined"
              aria-label="generate"
              className={styles.button}
            >
              Generate
            </Button>
          </Box>

          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <InputText
                id="firstName"
                label="First Name"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            )}
          />
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <InputText
                id="lastName"
                label="Last Name"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <InputPhone
                label="Phone"
                value={field.value}
                onChange={field.onChange}
                error={!!errors.phone}
                helperText={errors.phone?.message}
              />
            )}
          />
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field }) => (
              <InputDate
                label="Date of Birth"
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) => field.onChange(date?.toDate() ?? null)}
                error={!!errors.dateOfBirth}
                helperText={errors.dateOfBirth?.message}
              />
            )}
          />
        </div>
        <Button
          type="submit"
          variant="contained"
          disabled={!isDirty || isSubmitting}
          className={styles.button}
        >
          Update
        </Button>
        <PasswordConfirmModal
          open={passwordModalOpen}
          onClose={() => {
            setPasswordModalOpen(false);
            setPendingPassword('');
            setIsSubmitting(false);
          }}
          onConfirm={handlePasswordConfirm}
        />
      </Box>
      {error && (
        <ShowDialog message={error.text} onClose={() => setError(null)} />
      )}{' '}
    </>
  );
};

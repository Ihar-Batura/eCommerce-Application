import { Button, Dialog, DialogContent, IconButton } from '@mui/material';
import { Customer } from '@pages/profile/Profile';
import { useEffect, useState } from 'react';
import CancelIcon from '@mui/icons-material/Cancel';
import { InputText } from '@components/ui/inputs/inputText';
import InputPhone from '@components/ui/inputs/inputPhone';
import InputEmail from '@components/ui/inputs/InputEmail';
import InputDate from '@components/ui/inputs/datePicker';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  birthValidationSchema,
  emailValidationSchema,
  passwordValidationSchema,
  phoneValidationSchema,
  textValidationSchema,
} from '@shared/lib/validator/validator';
import * as yup from 'yup';
import dayjs from 'dayjs';
import InputPassword from '@components/ui/inputs/InputPassword';
import { updateField } from '@shared/api/commerce-tools/updateFields/updateField';
import { updateEmail } from '@shared/api/commerce-tools/updateFields/updateEmail';
import { updateCustomerPhone } from '@shared/api/commerce-tools/updateFields/updatePhone.';
import { PasswordConfirmModal } from '@components/ui/modals/ModalWithPassword';
import { updatePassword } from '@shared/api/commerce-tools/updateFields/updatePassword';
import { userAuthorization } from '@shared/api/commerce-tools/authorization';
import { PersonalInfoForm } from '@components/common/forms/profile-forms/updatePersonalForm';
import CloseIcon from '@mui/icons-material/Close';
import styles from './profile.module.scss';
import ShowDialog from '@components/ui/modals/Modal';
import { decryptData, encryptData } from '@shared/lib/password/encryption';
import { loadPassword } from '@shared/api/local-storage/getPasswordFromLS';

interface PersonalInfoProps {
  customer: Customer;
  onSave?: (updatedData: Partial<Customer>) => void;
}

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth: Date;
}

export const PersonalInfo = ({ customer, onSave }: PersonalInfoProps) => {
  const [version, setVersion] = useState(customer.version ?? 1);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [savedPassword, setSavedPassword] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<{
    text: string;
    action?: () => void;
  } | null>(null);

  const { control, reset, trigger, getValues } = useForm<FormValues>({
    resolver: yupResolver(
      yup.object().shape({
        firstName: textValidationSchema,
        lastName: textValidationSchema,
        email: emailValidationSchema,
        password: passwordValidationSchema,
        phone: phoneValidationSchema,
        dateOfBirth: birthValidationSchema,
      })
    ),
    defaultValues: {
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
      email: customer.email ?? '',
      phone: customer.custom?.fields.phone ?? '',
      password: savedPassword,
      dateOfBirth: customer.dateOfBirth
        ? new Date(customer.dateOfBirth)
        : new Date(dayjs().subtract(18, 'year').toDate()),
    },
    mode: 'onChange',
  });

  useEffect(() => {
    const encryptedPassword = localStorage.getItem('password');
    if (encryptedPassword) {
      const decryptedPassword = decryptData(encryptedPassword);
      setSavedPassword(decryptedPassword);
      reset({ ...getValues(), password: decryptedPassword });
    }
  }, [reset, getValues]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'password') {
        const newPassword = e.newValue ? decryptData(e.newValue) : '';
        setSavedPassword(newPassword);
        reset({ ...getValues(), password: newPassword });
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [reset, getValues]);

  const [editingStates, setEditingStates] = useState({
    firstName: false,
    lastName: false,
    phone: false,
    email: false,
    password: false,
    dateOfBirth: false,
  });

  const handleEditStart = async (field: keyof typeof editingStates) => {
    await trigger(field);
    setEditingStates((prev) => ({ ...prev, [field]: true }));
  };

  const handlePasswordConfirm = async (currentPassword: string) => {
    try {
      const newPassword = getValues('password');
      const response = await updatePassword(
        newPassword,
        currentPassword,
        customer.id,
        version
      );
      if (!response)
        throw new Error(
          'Failed to update password. The current password value is incorrect'
        );
      setVersion(response.version ?? 1);
      setEditingStates((prev) => ({ ...prev, password: false }));

      const authResponse = await userAuthorization(
        {
          email: customer.email,
          password: newPassword,
        },
        'Password updated successfully'
      );

      if (authResponse) {
        const tokenName = 'authDysonToken';
        localStorage.setItem(tokenName, authResponse.access_token);
      }

      localStorage.setItem('password', encryptData(newPassword));
      setSavedPassword(newPassword);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Password confirmation failed';
      setError({ text: errorMessage, action: () => setError(null) });
    }
  };

  const handleCancel = (field: keyof typeof editingStates) => {
    reset({
      firstName: customer.firstName ?? '',
      lastName: customer.lastName ?? '',
      email: customer.email ?? '',
      password: localStorage.getItem('password') ?? '',
      phone: customer.custom?.fields.phone ?? '',
      dateOfBirth: customer.dateOfBirth
        ? new Date(customer.dateOfBirth)
        : new Date(dayjs().subtract(18, 'year').toDate()),
    });
    setEditingStates((prev) => ({ ...prev, [field]: false }));
  };

  const handleSave = async (field: keyof typeof editingStates) => {
    const isValid = await trigger(field);
    if (!isValid) return;

    setEditingStates((prev) => ({ ...prev, [field]: false }));

    try {
      const formValues = getValues();

      const updatedData: Partial<Customer> = {};

      switch (field) {
        case 'lastName': {
          const response = await updateField(
            formValues.lastName,
            customer.id,
            version,
            'setLastName'
          );
          if (response?.version) {
            setVersion(response.version);
            updatedData.version = response.version;
          }
          updatedData.lastName = formValues.lastName;
          break;
        }

        case 'firstName': {
          const response = await updateField(
            formValues.firstName,
            customer.id,
            version,
            'setFirstName'
          );
          if (response?.version) {
            setVersion(response.version);
            updatedData.version = response.version;
          }
          updatedData.firstName = formValues.firstName;
          break;
        }

        case 'email': {
          const response = await updateEmail(
            formValues.email,
            customer.id,
            version
          );
          if (response?.version) {
            setVersion(response.version);
            updatedData.version = response.version;
          }
          updatedData.email = formValues.email;
          break;
        }

        case 'phone': {
          const response = await updateCustomerPhone(
            formValues.phone,
            customer.id,
            version
          );
          if (response?.version) {
            setVersion(response.version);
            updatedData.version = response.version;
          }
          if (updatedData.custom)
            updatedData.custom.fields.phone = formValues.phone;
          break;
        }

        case 'dateOfBirth': {
          const newDate = dayjs(formValues.dateOfBirth).format('YYYY-MM-DD');
          const response = await updateField(
            newDate,
            customer.id,
            version,
            'setDateOfBirth'
          );
          if (response?.version) {
            setVersion(response.version);
            updatedData.version = response.version;
          }
          updatedData.dateOfBirth = newDate;
          break;
        }

        case 'password': {
          setPasswordModalOpen(true);
          updatedData.password = formValues.password;
          break;
        }
      }

      onSave?.(updatedData);
    } catch {
      setEditingStates((prev) => ({ ...prev, [field]: true }));
      setError({
        text: `Error saving ${field}:`,
        action: () => setError(null),
      });
    }
  };

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  const setDate = (date: string | undefined, customer: Customer): Date => {
    if (date) return new Date(date);
    if (customer.dateOfBirth) return new Date(customer.dateOfBirth);
    else return new Date(dayjs().subtract(18, 'year').toDate());
  };

  return (
    <div className={styles.personalInfo}>
      <div className={styles.infoHeader}>
        <h3>Personal Info</h3>
        <Button
          variant="outlined"
          onClick={handleOpenForm}
          className={styles.button}
        >
          Redact Info
        </Button>
      </div>

      <ul>
        <li className={styles.personalInfoItem}>
          <span className={styles.type}>First Name</span>
          <Controller
            name="firstName"
            control={control}
            render={({ field, fieldState }) => (
              <InputText
                id="first-name"
                label=""
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  trigger('firstName');
                }}
                readOnly={!editingStates.firstName}
                isEditing={editingStates.firstName}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onEditClick={() =>
                  editingStates.firstName
                    ? handleSave('firstName')
                    : handleEditStart('firstName')
                }
              />
            )}
          />
          {editingStates.firstName && (
            <IconButton
              onClick={() => handleCancel('firstName')}
              size="small"
              className={styles.closeBtn}
            >
              <CancelIcon />
            </IconButton>
          )}
        </li>

        <li className={styles.personalInfoItem}>
          <span className={styles.type}>Last Name</span>
          <Controller
            name="lastName"
            control={control}
            render={({ field, fieldState }) => (
              <InputText
                id="last-name"
                label=""
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  trigger('lastName');
                }}
                readOnly={!editingStates.lastName}
                isEditing={editingStates.lastName}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onEditClick={() =>
                  editingStates.lastName
                    ? handleSave('lastName')
                    : handleEditStart('lastName')
                }
              />
            )}
          />
          {editingStates.lastName && (
            <IconButton
              onClick={() => handleCancel('lastName')}
              size="small"
              className={styles.closeBtn}
            >
              <CancelIcon />
            </IconButton>
          )}
        </li>

        <li className={styles.personalInfoItem}>
          <span className={styles.type}>Email</span>
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <InputEmail
                label=""
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  trigger('email');
                }}
                readOnly={!editingStates.email}
                isEditing={editingStates.email}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onEditClick={() =>
                  editingStates.email
                    ? handleSave('email')
                    : handleEditStart('email')
                }
              />
            )}
          />
          {editingStates.email && (
            <IconButton
              onClick={() => handleCancel('email')}
              size="small"
              className={styles.closeBtn}
            >
              <CancelIcon />
            </IconButton>
          )}
        </li>

        <li className={styles.personalInfoItem}>
          <span className={styles.type}>Password</span>
          <Controller
            name="password"
            control={control}
            render={({ field, fieldState }) => (
              <InputPassword
                label=""
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  trigger('password');
                }}
                readOnly={!editingStates.password}
                isEditing={editingStates.password}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onEditClick={() =>
                  editingStates.password
                    ? handleSave('password')
                    : handleEditStart('password')
                }
              />
            )}
          />
          {editingStates.password && (
            <IconButton
              onClick={() => handleCancel('password')}
              size="small"
              className={styles.closeBtn}
              value={localStorage.getItem('password') ?? ''}
            >
              <CancelIcon />
            </IconButton>
          )}
        </li>

        <li className={styles.personalInfoItem}>
          <span className={styles.type}>Phone</span>
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <InputPhone
                label=""
                value={field.value}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  trigger('phone');
                }}
                readOnly={!editingStates.phone}
                isEditing={editingStates.phone}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onEditClick={() =>
                  editingStates.phone
                    ? handleSave('phone')
                    : handleEditStart('phone')
                }
              />
            )}
          />
          {editingStates.phone && (
            <IconButton
              onClick={() => handleCancel('phone')}
              size="small"
              className={styles.closeBtn}
            >
              <CancelIcon />
            </IconButton>
          )}
        </li>

        <li className={styles.personalInfoItem}>
          <span className={styles.type}>Date of Birth</span>
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field, fieldState }) => (
              <InputDate
                value={field.value ? dayjs(field.value) : null}
                onChange={(date) => {
                  field.onChange(date?.toDate() ?? null);
                  trigger('dateOfBirth');
                }}
                readOnly={!editingStates.dateOfBirth}
                isEditing={editingStates.dateOfBirth}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                onEditClick={() =>
                  editingStates.dateOfBirth
                    ? handleSave('dateOfBirth')
                    : handleEditStart('dateOfBirth')
                }
              />
            )}
          />
          {editingStates.dateOfBirth && (
            <IconButton
              onClick={() => handleCancel('dateOfBirth')}
              size="small"
              className={styles.closeBtn}
            >
              <CancelIcon />
            </IconButton>
          )}
        </li>
      </ul>
      <PasswordConfirmModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConfirm={handlePasswordConfirm}
      />
      <Dialog
        open={isFormOpen}
        onClose={handleCloseForm}
        maxWidth="md"
        fullWidth
      >
        <div className={styles.updateForm}>
          <div className={styles.closeButton}>
            <IconButton aria-label="close" onClick={handleCloseForm}>
              <CloseIcon />
            </IconButton>
          </div>
          <DialogContent className={styles.formContent}>
            <PersonalInfoForm
              customer={customer}
              version={version}
              onSave={(updatedData) => {
                reset({
                  firstName: updatedData.firstName ?? customer.firstName ?? '',
                  lastName: updatedData.lastName ?? customer.lastName ?? '',
                  email: updatedData.email ?? customer.email ?? '',
                  phone:
                    updatedData.custom?.fields.phone ??
                    customer.custom?.fields.phone ??
                    '',
                  dateOfBirth: setDate(updatedData.dateOfBirth, customer),
                  password: loadPassword(),
                });
                if (updatedData.version) {
                  setVersion(updatedData.version);
                }

                onSave?.(updatedData);
                handleCloseForm();
              }}
            />
          </DialogContent>
        </div>
      </Dialog>
      {error && (
        <ShowDialog message={error.text} onClose={() => setError(null)} />
      )}
    </div>
  );
};

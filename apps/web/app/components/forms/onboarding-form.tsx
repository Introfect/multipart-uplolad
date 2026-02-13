import { useForm } from "react-hook-form";
import { useSubmit } from "react-router";
import { isValidPhoneNumber, getCountries, getCountryCallingCode } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import type { OnboardingFormData, OnboardingActionData } from "~/types/auth";

const labelClassName = "text-[10px] uppercase tracking-[2px] leading-[15px] text-muted-foreground font-bold";

const countries = getCountries().map((code) => ({
  code,
  dialCode: `+${getCountryCallingCode(code)}`,
}));

// Put common countries first
const priorityCountries: CountryCode[] = ["IN", "US", "GB", "AE", "SG", "AU", "CA"];
const sortedCountries = [
  ...priorityCountries.map((code) => countries.find((c) => c.code === code)!),
  ...countries.filter((c) => !priorityCountries.includes(c.code)).sort((a, b) => a.code.localeCompare(b.code)),
];

export interface OnboardingFormProps {
  actionData?: OnboardingActionData;
}

export function OnboardingForm({ actionData }: OnboardingFormProps) {
  const submit = useSubmit();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormData>({
    defaultValues: {
      fullName: "",
      countryCode: "IN",
      phoneNumber: "",
      firmName: "",
    },
  });

  const countryCode = watch("countryCode");

  const onSubmit = (data: OnboardingFormData) => {
    const formData = new FormData();
    formData.set("fullName", data.fullName);
    formData.set("countryCode", data.countryCode);
    formData.set("phoneNumber", data.phoneNumber);
    formData.set("firmName", data.firmName);
    submit(formData, { method: "post" });
  };

  if (actionData?.success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20">
          <span className="material-symbols-outlined text-[20px] leading-[20px] text-primary">
            check_circle
          </span>
          <div className="space-y-1">
            <p className="text-[14px] leading-[20px] text-foreground font-medium">
              Profile Completed
            </p>
            <p className="text-[12px] leading-[16px] text-muted-foreground">
              Your professional details have been saved successfully.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName" className={labelClassName}>
          FULL NAME
        </Label>
        <Input
          id="fullName"
          variant="borderless"
          placeholder="John Doe"
          error={!!errors.fullName || !!actionData?.fieldErrors?.fullName}
          helperText={errors.fullName?.message || actionData?.fieldErrors?.fullName}
          disabled={isSubmitting}
          {...register("fullName", {
            required: "Full name is required",
            minLength: { value: 2, message: "Name must be at least 2 characters" },
          })}
        />
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phoneNumber" className={labelClassName}>
          PHONE NUMBER
        </Label>
        <div className="flex gap-3 items-start">
          <select
            className="bg-transparent border-0 border-b-2 border-strong pb-3 text-[14px] leading-[20px] text-foreground focus:outline-none focus:border-b-primary transition-colors w-[90px] shrink-0"
            {...register("countryCode")}
          >
            {sortedCountries.map((country) => (
              <option key={country.code} value={country.code} className="bg-background text-foreground">
                {country.code} {country.dialCode}
              </option>
            ))}
          </select>
          <Input
            id="phoneNumber"
            type="tel"
            variant="borderless"
            placeholder="98765 43210"
            error={!!errors.phoneNumber || !!actionData?.fieldErrors?.phoneNumber}
            helperText={errors.phoneNumber?.message || actionData?.fieldErrors?.phoneNumber}
            disabled={isSubmitting}
            {...register("phoneNumber", {
              required: "Phone number is required",
              validate: (value) => {
                if (!isValidPhoneNumber(value, countryCode as CountryCode)) {
                  return "Please enter a valid phone number";
                }
                return true;
              },
            })}
          />
        </div>
      </div>

      {/* Firm Name */}
      <div className="space-y-2">
        <Label htmlFor="firmName" className={labelClassName}>
          FIRM / INSTITUTION NAME
        </Label>
        <Input
          id="firmName"
          variant="borderless"
          placeholder="Architectural Studio"
          error={!!errors.firmName || !!actionData?.fieldErrors?.firmName}
          helperText={errors.firmName?.message || actionData?.fieldErrors?.firmName}
          disabled={isSubmitting}
          {...register("firmName", {
            required: "Firm name is required",
            minLength: { value: 2, message: "Firm name must be at least 2 characters" },
          })}
        />
      </div>

      {/* Submit */}
      <div className="space-y-4">
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Complete Registration"}
        </Button>
      </div>

      {/* Server Error */}
      {actionData?.error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20" role="alert">
          <span className="material-symbols-outlined text-[16px] leading-[16px] text-destructive">
            error
          </span>
          <p className="text-[12px] leading-[16px] text-destructive">
            {actionData.error}
          </p>
        </div>
      )}
    </form>
  );
}

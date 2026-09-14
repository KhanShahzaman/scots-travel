import { ContentCrmManager } from "@/components/admin/content-crm-manager";
import {
  defaultBookingFormContent,
  defaultGlobalContent,
  defaultHomeContent,
  getCmsBookingFormContent,
  getCmsGlobalContent,
  getCmsHomeContent,
} from "@/lib/cms-content";

export default async function AdminContentPage() {
  let initialHome = defaultHomeContent;
  let initialGlobal = defaultGlobalContent;
  let initialBookingForm = defaultBookingFormContent;

  try {
    [initialHome, initialGlobal, initialBookingForm] = await Promise.all([
      getCmsHomeContent(),
      getCmsGlobalContent(),
      getCmsBookingFormContent("default_booking_form"),
    ]);
  } catch (error) {
    console.error("ADMIN_CMS_LOAD_ERROR", error);
  }

  return (
    <ContentCrmManager
      initialHome={initialHome}
      initialGlobal={initialGlobal}
      initialBookingForm={initialBookingForm}
    />
  );
}

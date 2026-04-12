"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_ORG = "00000000-0000-0000-0000-000000000001";

export function useOrgId() {
  const [orgId, setOrgId] = useState(DEFAULT_ORG);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            if (data?.organization_id) setOrgId(data.organization_id);
          });
      }
    });
  }, []);

  return orgId;
}

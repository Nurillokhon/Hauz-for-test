/** @format */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { personalAccountQuery } from "#/account/queries";
import { sendCode, verifyCode } from "#/auth/functions";
import { safeRedirect } from "#/auth/redirect";

export const Route = createFileRoute("/sign-in")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  // Someone already signed in has nothing to do here.
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ href: safeRedirect(search.redirect) });
    }
  },
  component: SignIn,
});

type Step = { kind: "email" } | { kind: "code"; userId: string; email: string };

function SignIn() {
  const [step, setStep] = useState<Step>({ kind: "email" });

  return (
    <main>
      <h1>Sign in</h1>
      {step.kind === "email" ? (
        <EmailStep
          onSent={(userId, email) => setStep({ kind: "code", userId, email })}
        />
      ) : (
        <CodeStep
          userId={step.userId}
          email={step.email}
          onChangeEmail={() => setStep({ kind: "email" })}
        />
      )}
    </main>
  );
}

function EmailStep({
  onSent,
}: {
  onSent: (userId: string, email: string) => void;
}) {
  const [email, setEmail] = useState("");

  const send = useMutation({
    mutationFn: (email: string) => sendCode({ data: { email } }),
    onSuccess: ({ userId }, email) => onSent(userId, email),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        send.mutate(email.trim());
      }}
    >
      <label>
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      {send.error && <p role="alert">{send.error.message}</p>}

      <button type="submit" disabled={send.isPending}>
        {send.isPending ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}

function CodeStep({
  userId,
  email,
  onChangeEmail,
}: {
  userId: string;
  email: string;
  onChangeEmail: () => void;
}) {
  const [code, setCode] = useState("");
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const verify = useMutation({
    mutationFn: async (code: string) => {
      await verifyCode({ data: { userId, code } });
      queryClient.clear();

      return queryClient.fetchQuery(personalAccountQuery);
    },
    onSuccess: (account) => {
      const target = safeRedirect(search.redirect);

      if (account) {
        navigate({ href: target, replace: true });
      } else {
        navigate({
          to: '/onboarding',
          search: { redirect: target },
          replace: true,
        });
      }
    },
  });

  const resend = useMutation({
    mutationFn: () => sendCode({ data: { email } }),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        verify.mutate(code);
      }}
    >
      <p>
        We sent a 6-digit code to <strong>{email}</strong>. It is valid for 15
        minutes. Check your spam folder if it does not arrive.
      </p>
      <label>
        Code
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        />
      </label>
      {verify.error && <p role="alert">{verify.error.message}</p>}
      {resend.error && <p role="alert">{resend.error.message}</p>}
      {resend.isSuccess && <p>A new code is on its way.</p>}
      <button type="submit" disabled={verify.isPending}>
        {verify.isPending ? "Signing in…" : "Sign in"}
      </button>{" "}
      <button
        type="button"
        disabled={resend.isPending}
        onClick={() => resend.mutate()}
      >
        Send a new code
      </button>{" "}
      <button type="button" onClick={onChangeEmail}>
        Use a different email
      </button>
    </form>
  );
}

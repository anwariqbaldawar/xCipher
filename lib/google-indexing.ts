export function base64urlEncode(source: string | Uint8Array): string {
  let base64: string;
  if (typeof source === "string") {
    base64 = btoa(unescape(encodeURIComponent(source)));
  } else {
    let binary = "";
    for (let i = 0; i < source.byteLength; i++) {
      binary += String.fromCharCode(source[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function parsePrivateKey(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export async function createJwt(): Promise<string> {
  const email = process.env.GOOGLE_INDEXING_CLIENT_EMAIL;
  // Replace \\n with \n in case it's passed as a literal string in env
  const privateKeyPem = process.env.GOOGLE_INDEXING_PRIVATE_KEY?.replace(/\\n/g, "\n");
  
  if (!email || !privateKeyPem) {
    throw new Error("Missing Google Indexing credentials");
  }

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const privateKeyData = parsePrivateKey(privateKeyPem);
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyData,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = base64urlEncode(new Uint8Array(signatureBuffer));
  return `${unsignedToken}.${encodedSignature}`;
}

export async function getAccessToken(): Promise<string> {
  const jwt = await createJwt();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get access token: ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function notifyGoogleIndexing(articleUrl: string): Promise<void> {
  try {
    if (!process.env.GOOGLE_INDEXING_CLIENT_EMAIL || !process.env.GOOGLE_INDEXING_PRIVATE_KEY) {
      return;
    }

    const token = await getAccessToken();

    const res = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        url: articleUrl,
        type: "URL_UPDATED",
      }),
    });

    if (!res.ok) {
      console.warn(`[Google Indexing] Failed to notify ${articleUrl}:`, await res.text());
    } else {
      console.log(`[Google Indexing] Successfully notified Google about ${articleUrl}`);
    }
  } catch (error) {
    console.error("[Google Indexing] Error:", error);
  }
}

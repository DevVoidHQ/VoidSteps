/**
 * The desktop build is not public yet, so the only call to action is asking
 * for a copy. A mailto keeps the static site backendless; swap this for a
 * form endpoint when the list outgrows an inbox.
 */
const SUBJECT = encodeURIComponent("Can I get a copy of VoidSteps?");
const BODY = encodeURIComponent(
  "Hi Aneesh,\n\nCould you send me a copy of VoidSteps?\n\nMac or Windows:\nWhat I'd use it for:\n\nThanks"
);

export const ACCESS_URL = `mailto:aneeshbhat@devvoid.org?subject=${SUBJECT}&body=${BODY}`;
export const ACCESS_LABEL = "Ask me for a copy";

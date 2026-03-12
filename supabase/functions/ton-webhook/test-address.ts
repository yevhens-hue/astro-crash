import { Address } from "npm:@ton/core";

const raw = "0:4018dd00a5859b369e23cbc568985c0a29dc9c402b137199d4245d3464dad863";
const userFriendly = "EQBAGN3jApYWbNp4jy8VomFwKKdycQCsTcZnUJF00ZNrYY7o";

console.log(Address.parse(raw).toRawString());
console.log(Address.parse(userFriendly).toRawString());
console.log(Address.parse(raw).toRawString() === Address.parse(userFriendly).toRawString());

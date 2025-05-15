// Allow using @/ as an alias to 'src/' in TypeScript
declare module "@/*" {
  const value: any;
  export default value;
}

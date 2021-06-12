export default (app) => {
  app.post(
    `/tenant/:tenantId/user`,
    require('./userCreate').default,
  );
  app.get(
    `/tenant/:tenantId/user`,
    require('./userList').default,
  );
  app.get(
    `/tenant/:tenantId/user/autocomplete`,
    require('./userAutocomplete').default,
  );
  app.get(
    `/tenant/:tenantId/user/:id`,
    require('./userFind').default,
  );
};

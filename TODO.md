exists:
+ add TODO.md
+ templates
+ insert
+ update
+ select
+ id serial/unique
+ before:insert trigger
+ after:insert trigger
+ before:update trigger
+ after:update trigger
+ before:update of columns trigger
+ after:update of columns trigger
+ tests
+ default values
+ default value as function() {return value}
+ not null
+ update(  updatingRow => ({ sum: updatingRow.sum + 1 })  )
+ delete
+ unique
  
  
need:  
- validate types
- foreign key
- custom serial (sequences)
- joins

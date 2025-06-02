# --- Macros ---

# compilation
exec = gcc -Wall -Wextra -pedantic -O3 -g3 -fopenmp -fsanitize=address -fno-omit-frame-pointer -fno-optimize-sibling-calls
comp = gcc -c -Wall -Wextra -pedantic -O3 -g3 -fopenmp -fsanitize=address -fno-omit-frame-pointer -fno-optimize-sibling-calls
toexe = -o
toobj = -o

# sources
SRCSC= $(wildcard src/*/*.c)
SRCSH= $(wildcard src/*/*.h)

TSTSC= $(wildcard tst/*.c)

# objects
OBJS= $(wildcard obj/*.o)
OBJBM= $(wildcard src/*/*.o)


# --- Functions ---

all: test main

main: create_exe_main to_obj_src

test: bin_mkdir create_exe_new to_obj

clean: clean_o clean_bin

bin_mkdir:
	mkdir -p bin;

obj_mkdir:
	mkdir -p obj;

tst_mov:
	mv $(foreach   exe,  $(TSTSC:tst/%.c=%)  ,   $(exe) )   bin


create_exe_new: create_obj 
	$(foreach test_obj,$(TSTSC:%.c=%.o), $(exec) $(test_obj) $(SRCSC:%.c=%.o) $(toexe) $(test_obj:%.o=%);)

create_exe_main: create_obj_main
	$(exec) obj/main.o $(SRCSC:%.c=%.o) $(toexe)  app

to_obj: obj_mkdir to_obj_src to_obj_tst



to_obj_src: 
	mv $(foreach obj,$(SRCSC:%.c=%.o), $(obj) ) obj

to_obj_tst: 
	mv $(foreach obj,$(TSTSC:%.c=%.o), $(obj) ) obj


create_obj: create_obj_src create_obj_tst

create_obj_src: 
	$(foreach cfl,  $(SRCSC),  $(comp) $(cfl)  $(toobj) $(cfl:%.c=%).o;)

create_obj_tst:
	$(foreach cfl,  $(TSTSC),  $(comp) $(cfl)  $(toobj) $(cfl:%.c=%).o;)

create_obj_main: obj_mkdir create_obj_src
	$(comp) src/main.c $(toobj) obj/main.o